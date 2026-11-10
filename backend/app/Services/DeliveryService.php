<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\Payment;
use App\Models\Rating;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DeliveryService
{
    public function __construct(
        private TariffService $tariffs,
        private ServiceHours $hours,
        private PushNotifier $push,
    ) {}

    public function create(User $client, array $data): Delivery
    {
        $tariff = $this->tariffs->quote($data['pickup_zone_id'], $data['dropoff_zone_id']);

        return Delivery::create([
            ...$data,
            'code' => $this->newCode(),
            'client_id' => $client->id,
            'price' => $tariff->price,
            'commission' => $tariff->commission,
            'total' => $tariff->price + $tariff->commission,
            'status' => Delivery::AWAITING_PAYMENT,
            'confirmation_code' => (string) random_int(1000, 9999),
        ]);
    }

    /** Appelé quand FeexPay confirme le paiement : fonds bloqués, course proposée aux livreurs. */
    public function markPaid(Payment $payment, array $raw = []): void
    {
        DB::transaction(function () use ($payment, $raw) {
            $payment = Payment::lockForUpdate()->find($payment->id);
            if ($payment->status !== 'pending') {
                return; // déjà traité : protection contre les doublons
            }
            $payment->update(['status' => 'held', 'raw' => $raw ?: $payment->raw]);

            $delivery = Delivery::lockForUpdate()->find($payment->delivery_id);
            if ($delivery->status !== Delivery::AWAITING_PAYMENT) {
                return;
            }
            $this->start($delivery);
        });
    }

    /** Paiement à la livraison : accepté sous le plafond, si le client n'a pas d'annulations abusives. */
    public function payCash(User $client, Delivery $delivery): Delivery
    {
        if ($delivery->status !== Delivery::AWAITING_PAYMENT) {
            throw new BusinessRuleException('Cette commande est déjà payée ou annulée.', 409, 'not_payable');
        }
        $limit = Setting::cashLimit();
        if ($delivery->total > $limit) {
            throw new BusinessRuleException("Le paiement en espèces est limité à {$limit} FCFA. Payez par Mobile Money.", 422, 'cash_limit');
        }
        if ($client->abusive_cancellations >= 3) {
            throw new BusinessRuleException("Le paiement en espèces n'est plus disponible sur votre compte. Payez par Mobile Money.", 403, 'cash_blocked');
        }

        DB::transaction(function () use ($delivery) {
            $delivery = Delivery::lockForUpdate()->find($delivery->id);
            $delivery->update(['payment_method' => 'cash']);
            $this->start($delivery);
        });

        return $delivery->fresh();
    }

    /** Commande payée (ou en espèces) : la boutique confirme d'abord, sinon la course part aux livreurs. */
    private function start(Delivery $delivery): void
    {
        $delivery->update(['paid_at' => $delivery->payment_method === 'cash' ? null : now()]);
        if ($delivery->order_id) {
            app(OrderService::class)->onPaid($delivery);

            return;
        }
        $delivery->update(['status' => Delivery::PENDING]);
        $this->push->send($delivery->client, 'Commande confirmée', "Commande {$delivery->code} confirmée.", ['delivery_id' => $delivery->id]);
        if ($this->hours->isOpen()) {
            $this->notifyCouriers($delivery);
        }
    }

    /** Envoie la course aux livreurs disponibles de la zone de prise en charge. */
    public function notifyCouriers(Delivery $delivery): void
    {
        $couriers = User::query()
            ->where('role', User::ROLE_COURIER)->where('status', 'active')
            ->whereHas('courierProfile', fn ($q) => $q->where('validation_status', 'approved')
                ->where('available', true)->where('current_zone_id', $delivery->pickup_zone_id))
            ->get();

        $this->push->send($couriers, 'Nouvelle course', "{$delivery->total} FCFA · {$delivery->pickupZone->name} → {$delivery->dropoffZone->name}", ['delivery_id' => $delivery->id]);
    }

    public function accept(User $courier, int $deliveryId): Delivery
    {
        $this->ensureOpen();
        $this->ensureVerifiedCourier($courier);

        return DB::transaction(function () use ($courier, $deliveryId) {
            $delivery = Delivery::lockForUpdate()->findOrFail($deliveryId);

            if ($delivery->status !== Delivery::PENDING || $delivery->courier_id) {
                throw new BusinessRuleException('Cette course a déjà été prise.', 409, 'already_taken');
            }
            if (Delivery::where('courier_id', $courier->id)->whereIn('status', [Delivery::ACCEPTED, Delivery::IN_PROGRESS])->exists()) {
                throw new BusinessRuleException('Terminez votre course en cours avant d\'en accepter une autre.', 409, 'busy');
            }

            $delivery->update(['courier_id' => $courier->id, 'status' => Delivery::ACCEPTED, 'accepted_at' => now()]);
            $this->push->send($delivery->client, 'Livreur trouvé', "{$courier->first_name} a accepté votre course {$delivery->code}.", ['delivery_id' => $delivery->id]);

            return $delivery;
        });
    }

    public function assign(User $courier, Delivery $delivery): Delivery
    {
        if (! in_array($delivery->status, [Delivery::PENDING, Delivery::ACCEPTED], true)) {
            throw new BusinessRuleException('Cette course ne peut plus être réattribuée.', 409);
        }
        $this->ensureVerifiedCourier($courier);
        $delivery->update(['courier_id' => $courier->id, 'status' => Delivery::ACCEPTED, 'accepted_at' => now()]);
        $this->push->send($courier, 'Course attribuée', "La course {$delivery->code} vous a été attribuée.", ['delivery_id' => $delivery->id]);

        return $delivery;
    }

    public function pickup(User $courier, Delivery $delivery): Delivery
    {
        $this->ensureOpen();
        $this->ensureOwnMission($courier, $delivery, Delivery::ACCEPTED);
        $delivery->update(['status' => Delivery::IN_PROGRESS, 'picked_up_at' => now()]);
        app(OrderService::class)->syncFromDelivery($delivery);
        $this->push->send($delivery->client, 'Colis récupéré', "Votre colis {$delivery->code} est en route.", ['delivery_id' => $delivery->id]);

        return $delivery;
    }

    /** Le livreur signale son arrivée : au point de retrait (course acceptée) ou chez le destinataire (colis en route). */
    public function arrived(User $courier, Delivery $delivery): Delivery
    {
        if ($delivery->courier_id !== $courier->id) {
            throw new BusinessRuleException('Cette course ne vous est pas attribuée.', 403);
        }
        if ($delivery->status === Delivery::ACCEPTED) {
            $delivery->arrived_pickup_at ??= now();
            $delivery->save();
            $this->push->send($delivery->client, 'Livreur au point de retrait', "Le livreur récupère votre colis {$delivery->code}.", ['delivery_id' => $delivery->id]);
        } elseif ($delivery->status === Delivery::IN_PROGRESS) {
            $delivery->arrived_dropoff_at ??= now();
            $delivery->save();
            $this->push->send($delivery->client, 'Votre livreur est arrivé !', 'Donnez-lui votre code de livraison pour recevoir le colis.', ['delivery_id' => $delivery->id]);
        } else {
            throw new BusinessRuleException('Action impossible à cette étape de la livraison.', 409, 'bad_status');
        }

        return $delivery;
    }

    public function deliver(User $courier, Delivery $delivery, string $code): Delivery
    {
        $this->ensureOwnMission($courier, $delivery, Delivery::IN_PROGRESS);
        if (! hash_equals((string) $delivery->confirmation_code, $code)) {
            throw new BusinessRuleException('Code de livraison incorrect.', 422, 'bad_code');
        }

        DB::transaction(function () use ($delivery) {
            $delivery->update([
                'status' => Delivery::DELIVERED, 'delivered_at' => now(),
                'cash_collected_at' => $delivery->payment_method === 'cash' ? now() : null,
            ]);
            $delivery->payments()->where('status', 'held')->update(['status' => 'released']);
            app(OrderService::class)->syncFromDelivery($delivery);
        });
        $this->push->send($delivery->client, 'Colis livré', "Commande {$delivery->code} livrée. Notez votre livreur.", ['delivery_id' => $delivery->id]);

        return $delivery;
    }

    public function cancel(User $client, Delivery $delivery): Delivery
    {
        if (! in_array($delivery->status, [Delivery::AWAITING_PAYMENT, Delivery::AWAITING_MERCHANT, Delivery::PENDING, Delivery::ACCEPTED], true)) {
            throw new BusinessRuleException('Le colis est déjà en route, la commande ne peut plus être annulée.', 409, 'not_cancellable');
        }

        $fee = $delivery->status === Delivery::ACCEPTED ? (int) config('yako.cancellation_fee') : 0;

        DB::transaction(function () use ($delivery, $fee, $client) {
            $delivery->update(['status' => Delivery::CANCELLED, 'cancelled_at' => now(), 'cancellation_fee' => $fee]);
            // Remboursement : marqué ici, versé depuis l'admin (FeexPay n'expose pas de remboursement automatique dans le SDK).
            $delivery->payments()->where('status', 'held')->update(['status' => 'refunded']);
            if ($fee > 0) {
                $client->increment('abusive_cancellations');
            }
            app(OrderService::class)->syncFromDelivery($delivery);
        });

        if ($delivery->courier) {
            $this->push->send($delivery->courier, 'Course annulée', "Le client a annulé la course {$delivery->code}.", ['delivery_id' => $delivery->id]);
        }

        return $delivery;
    }

    /** Position du livreur pendant la course, pour le suivi sur carte. */
    public function updateLocation(User $courier, float $lat, float $lng): ?Delivery
    {
        $delivery = Delivery::where('courier_id', $courier->id)->whereIn('status', [Delivery::ACCEPTED, Delivery::IN_PROGRESS])->first();
        $delivery?->update(['courier_lat' => $lat, 'courier_lng' => $lng, 'location_at' => now()]);

        return $delivery;
    }

    public function rate(User $client, Delivery $delivery, array $data): Rating
    {
        if ($delivery->status !== Delivery::DELIVERED) {
            throw new BusinessRuleException('Vous pourrez noter le livreur après la livraison.', 409);
        }
        if ($delivery->rating()->exists()) {
            throw new BusinessRuleException('Cette livraison a déjà été notée.', 409);
        }

        $rating = Rating::create([...$data, 'delivery_id' => $delivery->id, 'client_id' => $client->id, 'courier_id' => $delivery->courier_id]);
        $this->refreshCourierRating($delivery->courier);

        return $rating;
    }

    private function refreshCourierRating(User $courier): void
    {
        $profile = $courier->courierProfile;
        $all = Rating::where('courier_id', $courier->id);
        $profile->update(['rating_avg' => round((float) $all->avg('score'), 2), 'rating_count' => $all->count()]);

        $window = config('yako.auto_suspend.window');
        $recent = Rating::where('courier_id', $courier->id)->latest('id')->limit($window)->pluck('score');
        if ($recent->count() >= $window && $recent->avg() < config('yako.auto_suspend.min_average')) {
            $courier->update(['status' => 'suspended']);
            $profile->update(['available' => false]);
        }
    }

    private function ensureOpen(): void
    {
        if (! $this->hours->isOpen()) {
            throw new BusinessRuleException($this->hours->message(), 403, 'outside_service_hours');
        }
    }

    private function ensureVerifiedCourier(User $courier): void
    {
        $profile = $courier->courierProfile;
        if (! $courier->isCourier() || ! $courier->isActive() || ! $profile instanceof CourierProfile || ! $profile->isVerified()) {
            throw new BusinessRuleException('Votre compte livreur doit être validé par l\'équipe YAKO.', 403, 'courier_not_verified');
        }
    }

    private function ensureOwnMission(User $courier, Delivery $delivery, string $expected): void
    {
        if ($delivery->courier_id !== $courier->id) {
            throw new BusinessRuleException('Cette course ne vous est pas attribuée.', 403);
        }
        if ($delivery->status !== $expected) {
            throw new BusinessRuleException('Action impossible à cette étape de la livraison.', 409, 'bad_status');
        }
    }

    private function newCode(): string
    {
        do {
            $code = 'YK'.Str::upper(Str::random(6));
        } while (Delivery::where('code', $code)->exists());

        return $code;
    }
}
