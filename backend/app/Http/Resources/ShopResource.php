<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ShopResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'category' => $this->category,
            'template' => $this->template,
            'color' => $this->color,
            'logo_url' => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null,
            'banner_url' => $this->banner_path ? Storage::disk('public')->url($this->banner_path) : null,
            'description' => $this->description,
            'zone' => $this->zone?->only('id', 'name', 'city'),
            'address' => $this->address,
            'opening_hours' => $this->opening_hours,
            'delivery_estimate' => [$this->prep_minutes, $this->prep_minutes + 15],
            'rating_avg' => $this->rating_avg,
            'rating_count' => $this->rating_count,
            'status' => $this->status,
            'categories' => $this->whenLoaded('categories', fn () => $this->categories->map->only('id', 'name')),
        ];
    }
}
