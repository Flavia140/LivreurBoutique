<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourierDocument extends Model
{
    protected $fillable = ['courier_profile_id', 'type', 'path', 'document_number', 'expires_on', 'status'];

    protected $hidden = ['document_number'];

    protected function casts(): array
    {
        return ['document_number' => 'encrypted', 'expires_on' => 'date'];
    }

    public function courierProfile(): BelongsTo
    {
        return $this->belongsTo(CourierProfile::class);
    }
}
