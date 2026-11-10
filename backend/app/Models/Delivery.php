<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Delivery extends Model
{
    public const AWAITING_PAYMENT = 'awaiting_payment';

    public const PENDING = 'pending';       // payée, en attente d'un livreur

    public const ACCEPTED = 'accepted';

    public const IN_PROGRESS = 'in_progress';

    public const DELIVERED = 'delivered';

    public const CANCELLED = 'cancelled';

    public const PARCEL_TYPES = ['document', 'food', 'clothes', 'other'];

    protected $fillable = [
        'code', 'client_id', 'courier_id', 'pickup_zone_id', 'pickup_address', 'pickup_contact_phone',
        'dropoff_zone_id', 'dropoff_address', 'recipient_name', 'recipient_phone', 'parcel_type', 'notes',
        'price', 'commission', 'total', 'status', 'confirmation_code', 'cancellation_fee',
        'paid_at', 'accepted_at', 'picked_up_at', 'delivered_at', 'cancelled_at',
    ];

    protected $hidden = ['confirmation_code'];

    protected function casts(): array
    {
        return [
            'confirmation_code' => 'encrypted',
            'paid_at' => 'datetime', 'accepted_at' => 'datetime', 'picked_up_at' => 'datetime',
            'delivered_at' => 'datetime', 'cancelled_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function courier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'courier_id');
    }

    public function pickupZone(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'pickup_zone_id');
    }

    public function dropoffZone(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'dropoff_zone_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function rating(): HasOne
    {
        return $this->hasOne(Rating::class);
    }
}
