<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $d = $this->delivery;

        return [
            'id' => $this->id,
            'code' => $this->code,
            'status' => $this->status,
            'shop' => $this->shop?->only('id', 'name', 'color'),
            'items' => $this->items->map->only('product_id', 'name', 'unit_price', 'quantity', 'line_total'),
            'subtotal' => $this->subtotal,
            'delivery_fee' => $d ? $d->price + $d->commission : 0,
            'total' => $d?->total ?? $this->subtotal,
            'rejection_reason' => $this->rejection_reason,
            'rated' => $this->rating()->exists(),
            'client' => $this->when($request->user()?->id !== $this->client_id, fn () => [
                'first_name' => $this->client->first_name, 'last_name' => $this->client->last_name, 'phone' => $this->client->phone,
            ]),
            'delivery' => $d ? new DeliveryResource($d->loadMissing('pickupZone', 'dropoffZone', 'courier.courierProfile', 'client')) : null,
            'created_at' => $this->created_at,
        ];
    }
}
