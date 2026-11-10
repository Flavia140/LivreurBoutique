<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected $fillable = ['shop_id', 'product_category_id', 'name', 'description', 'price', 'promo_price', 'stock', 'image_path', 'active', 'sold_count'];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'price' => 'integer', 'promo_price' => 'integer', 'stock' => 'integer'];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function currentPrice(): int
    {
        return $this->promo_price && $this->promo_price < $this->price ? $this->promo_price : $this->price;
    }

    public function inStock(int $qty = 1): bool
    {
        return $this->stock === null || $this->stock >= $qty;
    }
}
