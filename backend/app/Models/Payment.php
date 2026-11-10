<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = ['delivery_id', 'provider', 'reference', 'network', 'phone', 'amount', 'status', 'raw'];

    protected function casts(): array
    {
        return ['raw' => 'array'];
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }
}
