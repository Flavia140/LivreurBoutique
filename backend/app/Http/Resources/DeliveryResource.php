<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isClient = $request->user()?->id === $this->client_id;

        return [
            'id' => $this->id,
            'code' => $this->code,
            'status' => $this->status,
            'pickup' => ['zone' => $this->pickupZone?->only('id', 'name', 'city'), 'address' => $this->pickup_address, 'contact_phone' => $this->pickup_contact_phone],
            'dropoff' => ['zone' => $this->dropoffZone?->only('id', 'name', 'city'), 'address' => $this->dropoff_address, 'recipient_name' => $this->recipient_name, 'recipient_phone' => $this->recipient_phone],
            'parcel_type' => $this->parcel_type,
            'notes' => $this->notes,
            'price' => $this->price,
            'commission' => $this->commission,
            'total' => $this->total,
            'payment_method' => $this->payment_method,
            // En espèces, le livreur encaisse le total à la remise.
            'cash_to_collect' => $this->payment_method === 'cash' ? $this->total : 0,
            'cancellation_fee' => $this->cancellation_fee,
            // Le code de remise n'est visible que du client, qui le transmet au destinataire.
            'confirmation_code' => $this->when($isClient, fn () => $this->confirmation_code),
            'courier' => $this->courier ? [
                'id' => $this->courier->id,
                'first_name' => $this->courier->first_name,
                'phone' => $this->when(in_array($this->status, ['accepted', 'in_progress'], true), $this->courier->phone),
                'vehicle_type' => $this->courier->courierProfile?->vehicle_type,
                'rating_avg' => $this->courier->courierProfile?->rating_avg,
                'verified' => (bool) $this->courier->courierProfile?->isVerified(),
            ] : null,
            'client' => $this->when(! $isClient, fn () => ['first_name' => $this->client->first_name, 'phone' => $this->client->phone]),
            'rated' => $this->rating()->exists(),
            'order_id' => $this->order_id,
            'goods_amount' => $this->goods_amount,
            'courier_position' => $this->when(
                in_array($this->status, ['accepted', 'in_progress'], true) && $this->courier_lat !== null,
                fn () => ['lat' => $this->courier_lat, 'lng' => $this->courier_lng, 'at' => $this->location_at],
            ),
            'paid_at' => $this->paid_at,
            'accepted_at' => $this->accepted_at,
            'picked_up_at' => $this->picked_up_at,
            'delivered_at' => $this->delivered_at,
            'cancelled_at' => $this->cancelled_at,
            'created_at' => $this->created_at,
        ];
    }
}
