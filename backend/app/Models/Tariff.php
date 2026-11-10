<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Tariff extends Model
{
    public const LINK_TYPES = ['same_area', 'intra_city', 'intercity_short', 'intercity_medium', 'intercity_long'];

    protected $fillable = ['from_zone_id', 'to_zone_id', 'link_type', 'price', 'commission', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'price' => 'integer', 'commission' => 'integer'];
    }

    public function fromZone(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'from_zone_id');
    }

    public function toZone(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'to_zone_id');
    }
}
