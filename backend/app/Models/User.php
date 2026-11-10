<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_CLIENT = 'client';

    public const ROLE_COURIER = 'courier';

    public const ROLE_MERCHANT = 'merchant';

    public const ROLE_ADMIN = 'admin';

    protected $fillable = [
        'first_name', 'last_name', 'phone', 'email', 'password', 'role', 'status', 'address', 'zone_id', 'phone_verified_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function courierProfile(): HasOne
    {
        return $this->hasOne(CourierProfile::class);
    }

    public function merchantApplication(): HasOne
    {
        return $this->hasOne(MerchantApplication::class);
    }

    public function shop(): HasOne
    {
        return $this->hasOne(Shop::class, 'merchant_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'merchant_id');
    }

    public function activeSubscription(): ?Subscription
    {
        return $this->subscriptions()->where('status', 'active')->where('ends_at', '>', now())->latest('ends_at')->first();
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class, 'client_id');
    }

    public function missions(): HasMany
    {
        return $this->hasMany(Delivery::class, 'courier_id');
    }

    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    public function isCourier(): bool
    {
        return $this->role === self::ROLE_COURIER;
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
