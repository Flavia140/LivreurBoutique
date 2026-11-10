<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantApplication extends Model
{
    public const CATEGORIES = ['alimentaire', 'mode', 'electronique', 'sante', 'beaute', 'maison', 'autre'];

    protected $fillable = ['user_id', 'business_name', 'category', 'ifu', 'rccm', 'zone_id', 'address', 'description', 'documents', 'status', 'admin_notes'];

    protected function casts(): array
    {
        return ['documents' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
