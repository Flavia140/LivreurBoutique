<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    public function __construct(private FeexPayClient $feexpay, private PushNotifier $push) {}

    public function start(User $merchant, string $plan, string $network, string $phone): array
    {
        $config = config("yako.plans.{$plan}");
        if (! $config) {
            throw new BusinessRuleException('Formule inconnue.', 422);
        }
        if ($merchant->merchantApplication?->status !== 'approved') {
            throw new BusinessRuleException("Votre commerce doit d'abord être validé par l'équipe YAKO.", 403, 'merchant_not_approved');
        }

        $result = $this->feexpay->requestToPay($config['amount'], $phone, $network, trim("{$merchant->first_name} {$merchant->last_name}"), $merchant->email);

        return DB::transaction(function () use ($merchant, $plan, $config, $network, $phone, $result) {
            $subscription = Subscription::create(['merchant_id' => $merchant->id, 'plan' => $plan, 'amount' => $config['amount']]);
            $payment = Payment::create([
                'subscription_id' => $subscription->id, 'reference' => $result['reference'], 'network' => $network,
                'phone' => $phone, 'amount' => $config['amount'], 'status' => 'pending', 'raw' => $result,
            ]);

            return [$subscription, $payment];
        });
    }

    /** Paiement confirmé : l'abonnement démarre à la fin de l'abonnement en cours, sinon tout de suite. */
    public function activate(Payment $payment, array $raw = []): void
    {
        DB::transaction(function () use ($payment, $raw) {
            $payment = Payment::lockForUpdate()->find($payment->id);
            if ($payment->status !== 'pending') {
                return;
            }
            $payment->update(['status' => 'released', 'raw' => $raw ?: $payment->raw]);

            $subscription = $payment->subscription;
            $current = $subscription->merchant->activeSubscription();
            $start = $current?->ends_at ?? now();
            $subscription->update([
                'status' => 'active',
                'starts_at' => $start,
                'ends_at' => $start->copy()->addMonths(config("yako.plans.{$subscription->plan}.months")),
            ]);
            $this->push->send($subscription->merchant, 'Abonnement activé', "Votre abonnement {$subscription->plan} est actif jusqu'au {$subscription->ends_at->format('d/m/Y')}.");
        });
    }
}
