<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Tariff;

/** Tarification fixe : une ligne de la grille par couple de zones. */
class TariffService
{
    public function quote(int $fromZoneId, int $toZoneId): Tariff
    {
        $tariff = Tariff::query()
            ->where('active', true)
            ->where(function ($q) use ($fromZoneId, $toZoneId) {
                $q->where(fn ($q) => $q->where('from_zone_id', $fromZoneId)->where('to_zone_id', $toZoneId))
                    ->orWhere(fn ($q) => $q->where('from_zone_id', $toZoneId)->where('to_zone_id', $fromZoneId));
            })
            ->first();

        if (! $tariff) {
            throw new BusinessRuleException("Cette liaison n'est pas encore desservie.", 422, 'no_tariff');
        }

        return $tariff;
    }
}
