<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shop extends Model
{
    public const TEMPLATES = ['general', 'mode', 'alimentation', 'electronique'];

    protected $fillable = [
        'merchant_id', 'name', 'slug', 'category', 'template', 'color', 'logo_path', 'banner_path', 'description',
        'zone_id', 'address', 'opening_hours', 'prep_minutes', 'rating_avg', 'rating_count', 'featured', 'status',
    ];

    protected function casts(): array
    {
        return ['opening_hours' => 'array', 'featured' => 'boolean', 'rating_avg' => 'float'];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(ProductCategory::class)->orderBy('position');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function isLive(): bool
    {
        return $this->status === 'live';
    }
}
