<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'role' => $this->role,
            'status' => $this->status,
            'address' => $this->address,
            'zone' => $this->whenLoaded('zone', fn () => $this->zone ? ['id' => $this->zone->id, 'name' => $this->zone->name, 'city' => $this->zone->city] : null),
            'courier' => $this->whenLoaded('courierProfile', fn () => $this->courierProfile ? [
                'validation_status' => $this->courierProfile->validation_status,
                'verified' => $this->courierProfile->isVerified(),
                'vehicle_type' => $this->courierProfile->vehicle_type,
                'available' => $this->courierProfile->available,
                'rating_avg' => $this->courierProfile->rating_avg,
                'rating_count' => $this->courierProfile->rating_count,
                'missing_documents' => $this->courierProfile->missingDocuments(),
            ] : null),
            'merchant' => $this->whenLoaded('merchantApplication', fn () => $this->merchantApplication ? [
                'business_name' => $this->merchantApplication->business_name,
                'category' => $this->merchantApplication->category,
                'status' => $this->merchantApplication->status,
            ] : null),
        ];
    }
}
