<?php

namespace App\Services;

use Carbon\CarbonImmutable;

/** Règle de sécurité : prises en charge et livraisons uniquement entre 7h et 21h (heure du Bénin). */
class ServiceHours
{
    public const TIMEZONE = 'Africa/Porto-Novo';

    public function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::TIMEZONE);
    }

    public function isOpen(?CarbonImmutable $at = null): bool
    {
        $at = ($at ?? $this->now())->setTimezone(self::TIMEZONE);
        [$start, $end] = $this->bounds($at);

        return $at->greaterThanOrEqualTo($start) && $at->lessThan($end);
    }

    public function nextOpening(?CarbonImmutable $at = null): CarbonImmutable
    {
        $at = ($at ?? $this->now())->setTimezone(self::TIMEZONE);
        [$start] = $this->bounds($at);

        if ($this->isOpen($at)) {
            return $at;
        }

        return $at->lessThan($start) ? $start : $start->addDay();
    }

    public function message(): string
    {
        return sprintf(
            'Les livraisons se font uniquement entre %s et %s. Vous pouvez commander à toute heure : votre demande sera traitée dès %s.',
            str_replace(':', 'h', config('yako.service_hours.start')),
            str_replace(':', 'h', config('yako.service_hours.end')),
            str_replace(':', 'h', config('yako.service_hours.start')),
        );
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function bounds(CarbonImmutable $day): array
    {
        [$sh, $sm] = array_map('intval', explode(':', config('yako.service_hours.start')));
        [$eh, $em] = array_map('intval', explode(':', config('yako.service_hours.end')));

        return [$day->setTime($sh, $sm), $day->setTime($eh, $em)];
    }
}
