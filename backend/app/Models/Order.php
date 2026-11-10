<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    public const AWAITING_PAYMENT = 'awaiting_payment';

    public const PENDING_CONFIRMATION = 'pending_confirmation';

    public const CONFIRMED = 'confirmed';

    public const IN_DELIVERY = 'in_delivery';

    public const DELIVERED = 'delivered';

    public const REJECTED = 'rejected';

    public const CANCELLED = 'cancelled';

    protected $fillable = ['code', 'client_id', 'shop_id', 'status', 'subtotal', 'rejection_reason', 'confirmed_at'];

    protected function casts(): array
    {
        return ['confirmed_at' => 'datetime'];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function delivery(): HasOne
    {
        return $this->hasOne(Delivery::class);
    }

    public function rating(): HasOne
    {
        return $this->hasOne(ShopRating::class);
    }
}
