<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourierProfile extends Model
{
    public const REQUIRED_DOCUMENTS = ['student_card', 'id_card', 'license', 'registration', 'insurance', 'vehicle_photo', 'profile_photo'];

    protected $fillable = [
        'user_id', 'vehicle_type', 'plate_number', 'university', 'validation_status', 'rejection_reason',
        'verified_at', 'available', 'current_zone_id', 'rating_avg', 'rating_count',
    ];

    protected function casts(): array
    {
        return ['verified_at' => 'datetime', 'available' => 'boolean', 'rating_avg' => 'float'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(CourierDocument::class);
    }

    public function currentZone(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'current_zone_id');
    }

    public function isVerified(): bool
    {
        return $this->validation_status === 'approved';
    }

    public function missingDocuments(): array
    {
        return array_values(array_diff(self::REQUIRED_DOCUMENTS, $this->documents()->pluck('type')->all()));
    }
}
