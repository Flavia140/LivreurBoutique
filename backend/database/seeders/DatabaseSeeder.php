<?php

namespace Database\Seeders;

use App\Models\Tariff;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /** Zones et grille d'exemple du cahier des charges (montants indicatifs, à remplacer). */
    public function run(): void
    {
        $zones = collect([
            ['Cotonou', 'Cotonou Centre', 'Littoral'],
            ['Cotonou', 'Akpakpa', 'Littoral'],
            ['Cotonou', 'Fidjrossè', 'Littoral'],
            ['Cotonou', 'Cadjèhoun', 'Littoral'],
            ['Abomey-Calavi', 'Abomey-Calavi Centre', 'Atlantique'],
            ['Porto-Novo', 'Porto-Novo Centre', 'Ouémé'],
            ['Bohicon', 'Bohicon Centre', 'Zou'],
            ['Parakou', 'Parakou Centre', 'Borgou'],
        ])->mapWithKeys(fn ($z) => [$z[1] => Zone::firstOrCreate(['city' => $z[0], 'name' => $z[1]], ['department' => $z[2]])]);

        $longDistance = ['Bohicon' => ['intercity_medium', 2500], 'Parakou' => ['intercity_long', 5000], 'Abomey-Calavi' => ['intercity_short', 1200], 'Porto-Novo' => ['intercity_short', 1200]];

        foreach ($zones as $from) {
            foreach ($zones as $to) {
                if ($from->id > $to->id) {
                    continue;
                }
                if ($from->id === $to->id) {
                    [$type, $price] = ['same_area', 500];
                } elseif ($from->city === $to->city) {
                    [$type, $price] = ['intra_city', 800];
                } else {
                    $far = $from->city === 'Cotonou' ? $to->city : $from->city;
                    [$type, $price] = $longDistance[$far] ?? ['intercity_medium', 2500];
                }
                Tariff::updateOrCreate(['from_zone_id' => $from->id, 'to_zone_id' => $to->id], ['link_type' => $type, 'price' => $price, 'commission' => 100]);
            }
        }

        User::firstOrCreate(['phone' => '+2290100000000'], [
            'first_name' => 'Admin', 'last_name' => 'YAKO', 'password' => env('ADMIN_PASSWORD') ?: Str::password(16), 'role' => 'admin', 'phone_verified_at' => now(),
        ]);
    }
}
