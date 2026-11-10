<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'shop_id' => $this->shop_id,
            'shop' => $this->whenLoaded('shop', fn () => $this->shop->only('id', 'name', 'color')),
            'category_id' => $this->product_category_id,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'promo_price' => $this->promo_price,
            'current_price' => $this->currentPrice(),
            'stock' => $this->stock,
            'available' => $this->active && $this->inStock(),
            'active' => $this->active,
            'image_url' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
            'sold_count' => $this->sold_count,
        ];
    }
}
