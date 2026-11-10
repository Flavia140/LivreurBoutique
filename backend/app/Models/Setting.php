<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Réglages modifiables depuis l'admin (ex. plafond des paiements en espèces). */
class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::find($key)?->value ?? $default;
    }

    public static function put(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => (string) $value]);
    }

    public static function cashLimit(): int
    {
        return (int) static::get('cash_limit', config('yako.cash_limit'));
    }
}
