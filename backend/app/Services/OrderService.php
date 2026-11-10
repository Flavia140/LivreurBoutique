<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shop;
use App\Models\ShopRating;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Commandes en boutique. Chaque commande porte une livraison : le paiement, le blocage des fonds,
 * l'attribution au livreur et le code de remise réutilisent le parcours de livraison.
 */
class OrderService
{
    public function __construct(private TariffService $tariffs, private ServiceHours $hours, private PushNotifier $push, private DeliveryService $deliveries) {}

    /** @param array<int, array{product_id: int, quantity: int}> $items */
    public function create(User $client, Shop $shop, array $items, array $dropoff): Order
    {
        if (! $shop->isLive()) {
            throw new BusinessRuleException("Cette boutique n'accepte pas de commandes pour le moment.", 409, 'shop_closed');
        }

        return DB::transaction(function () use ($client, $shop, $items, $dropoff) {
            $products = Product::where('shop_id', $shop->id)->where('active', true)
                ->whereIn('id', collect($items)->pluck('product_id'))->get()->keyBy('id');

            $lines = [];
            $subtotal = 0;
            foreach ($items as $item) {
                $product = $products->get($item['product_id']);
                if (! $product) {
                    throw new BusinessRuleException("Un produit de votre panier n'est plus disponible.", 422, 'product_unavailable');
                }
                if (! $product->inStock($item['quantity'])) {
                    throw new BusinessRuleException("Stock insuffisant pour « {$product->name} ».", 422, 'out_of_stock');
                }
                $unit = $product->currentPrice();
                $lines[] = ['product_id' => $product->id, 'name' => $product->name, 'unit_price' => $unit, 'quantity' => $item['quantity'], 'line_total' => $unit * $item['quantity']];
                $subtotal += $unit * $item['quantity'];
            }

            $tariff = $this->tariffs->quote($shop->zone_id, $dropoff['dropoff_zone_id']);

            $order = Order::create([
                'code' => $this->newCode(),
                'client_id' => $client->id,
                'shop_id' => $shop->id,
                'status' => Order::AWAITING_PAYMENT,
                'subtotal' => $subtotal,
            ]);
            $order->items()->createMany($lines);

            Delivery::create([
                'code' => $order->code,
                'order_id' => $order->id,
                'client_id' => $client->id,
                'pickup_zone_id' => $shop->zone_id,
                'pickup_address' => "{$shop->name}, {$shop->address}",
                'pickup_contact_phone' => $shop->merchant->phone,
                'dropoff_zone_id' => $dropoff['dropoff_zone_id'],
                'dropoff_address' => $dropoff['dropoff_address'],
                'recipient_name' => $dropoff['recipient_name'] ?? trim("{$client->first_name} {$client->last_name}"),
                'recipient_phone' => $dropoff['recipient_phone'] ?? $client->phone,
                'parcel_type' => $shop->category === 'alimentaire' ? 'food' : ($shop->category === 'mode' ? 'clothes' : 'other'),
                'notes' => $dropoff['notes'] ?? null,
                'price' => $tariff->price,
                'commission' => $tariff->commission,
                'goods_amount' => $subtotal,
                'total' => $subtotal + $tariff->price + $tariff->commission,
                'status' => Delivery::AWAITING_PAYMENT,
                'confirmation_code' => (string) random_int(1000, 9999),
            ]);

            return $order->load('items', 'delivery');
        });
    }

    /** Paiement confirmé : on réserve le stock et on prévient le commerçant. */
    public function onPaid(Delivery $delivery): void
    {
        $order = $delivery->order;
        foreach ($order->items as $item) {
            Product::whereKey($item->product_id)->whereNotNull('stock')->decrement('stock', $item->quantity);
        }
        $delivery->update(['status' => Delivery::AWAITING_MERCHANT]);
        $order->update(['status' => Order::PENDING_CONFIRMATION]);
        $this->push->send($order->shop->merchant, 'Nouvelle commande', "Commande {$order->code} · {$order->subtotal} FCFA. Confirmez-la.", ['order_id' => $order->id]);
    }

    public function confirm(User $merchant, Order $order): Order
    {
        $this->ensureOwner($merchant, $order);
        if ($order->status !== Order::PENDING_CONFIRMATION) {
            throw new BusinessRuleException('Cette commande ne peut plus être confirmée.', 409, 'bad_status');
        }

        DB::transaction(function () use ($order) {
            $order->update(['status' => Order::CONFIRMED, 'confirmed_at' => now()]);
            $order->delivery->update(['status' => Delivery::PENDING]);
        });

        $this->push->send($order->client, 'Commande confirmée', "{$order->shop->name} prépare votre commande {$order->code}.", ['order_id' => $order->id]);
        if ($this->hours->isOpen()) {
            $this->deliveries->notifyCouriers($order->delivery->load('pickupZone', 'dropoffZone'));
        }

        return $order;
    }

    public function reject(User $merchant, Order $order, ?string $reason): Order
    {
        $this->ensureOwner($merchant, $order);
        if ($order->status !== Order::PENDING_CONFIRMATION) {
            throw new BusinessRuleException('Cette commande ne peut plus être refusée.', 409, 'bad_status');
        }

        DB::transaction(function () use ($order, $reason) {
            $order->update(['status' => Order::REJECTED, 'rejection_reason' => $reason]);
            $order->delivery->update(['status' => Delivery::CANCELLED, 'cancelled_at' => now()]);
            $order->delivery->payments()->where('status', 'held')->update(['status' => 'refunded']);
            $this->restock($order);
        });
        $this->push->send($order->client, 'Commande refusée', "{$order->shop->name} ne peut pas honorer la commande {$order->code}. Vous serez remboursé.", ['order_id' => $order->id]);

        return $order;
    }

    /** Synchronise le statut de la commande avec celui de sa livraison. */
    public function syncFromDelivery(Delivery $delivery): void
    {
        $order = $delivery->order;
        if (! $order) {
            return;
        }
        match ($delivery->status) {
            Delivery::IN_PROGRESS => $order->update(['status' => Order::IN_DELIVERY]),
            Delivery::DELIVERED => DB::transaction(function () use ($order) {
                $order->update(['status' => Order::DELIVERED]);
                foreach ($order->items as $item) {
                    Product::whereKey($item->product_id)->increment('sold_count', $item->quantity);
                }
            }),
            Delivery::CANCELLED => DB::transaction(function () use ($order) {
                $wasPaid = $order->status !== Order::AWAITING_PAYMENT;
                $order->update(['status' => Order::CANCELLED]);
                if ($wasPaid) {
                    $this->restock($order);
                }
            }),
            default => null,
        };
    }

    public function rate(User $client, Order $order, array $data): ShopRating
    {
        if ($order->status !== Order::DELIVERED) {
            throw new BusinessRuleException('Vous pourrez noter la boutique après la livraison.', 409);
        }
        if ($order->rating()->exists()) {
            throw new BusinessRuleException('Cette commande a déjà été notée.', 409);
        }
        $rating = ShopRating::create([...$data, 'order_id' => $order->id, 'shop_id' => $order->shop_id, 'client_id' => $client->id]);
        $all = ShopRating::where('shop_id', $order->shop_id);
        $order->shop->update(['rating_avg' => round((float) $all->avg('score'), 2), 'rating_count' => $all->count()]);

        return $rating;
    }

    private function restock(Order $order): void
    {
        foreach ($order->items as $item) {
            Product::whereKey($item->product_id)->whereNotNull('stock')->increment('stock', $item->quantity);
        }
    }

    private function ensureOwner(User $merchant, Order $order): void
    {
        if ($order->shop->merchant_id !== $merchant->id) {
            throw new BusinessRuleException('Commande introuvable.', 404);
        }
    }

    private function newCode(): string
    {
        do {
            $code = 'YK'.Str::upper(Str::random(6));
        } while (Order::where('code', $code)->exists() || Delivery::where('code', $code)->exists());

        return $code;
    }
}
