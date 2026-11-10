<?php

namespace Database\Seeders;

use App\Models\CourierDocument;
use App\Models\CourierProfile;
use App\Models\MerchantApplication;
use App\Models\Shop;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Boutiques de démonstration pour tester l'app (php artisan db:seed --class=DemoSeeder). Ne pas lancer en production. */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $centre = Zone::where('name', 'Cotonou Centre')->firstOrFail();
        $shops = [
            ['Africa Market', 'alimentaire', 'alimentation', '#2E7D32', [['Riz parfumé 5kg', 2500, 'Courses'], ['Huile d\'arachide 1L', 1200, 'Courses'], ['Tomates 1kg', 800, 'Fruits & Légumes'], ['Lait entier 1L', 1000, 'Courses']]],
            ['Ma Cuisine', 'alimentaire', 'alimentation', '#C62828', [['Riz au gras', 1500, 'Plats'], ['Amiwo poulet', 2500, 'Plats'], ['Jus de bissap', 500, 'Boissons']]],
            ['Tech World', 'electronique', 'electronique', '#1565C0', [['Écouteurs Bluetooth', 8500, 'Audio'], ['Chargeur rapide 20W', 4500, 'Accessoires']]],
            ['Boutique Mode Cotonou', 'mode', 'mode', '#6A1B9A', [['Robe en pagne', 12000, 'Femme'], ['Chemise wax', 9000, 'Homme']]],
        ];

        foreach ($shops as $i => [$name, $category, $template, $color, $products]) {
            $merchant = User::firstOrCreate(['phone' => '+22901900000'.str_pad((string) $i, 2, '0', STR_PAD_LEFT)], [
                'first_name' => 'Démo', 'last_name' => $name, 'password' => 'demo-'.$i.'-yako', 'role' => 'merchant', 'phone_verified_at' => now(),
            ]);
            MerchantApplication::firstOrCreate(['user_id' => $merchant->id], [
                'business_name' => $name, 'category' => $category, 'zone_id' => $centre->id, 'address' => 'Ganhi', 'status' => 'approved',
            ]);
            $shop = Shop::firstOrCreate(['merchant_id' => $merchant->id], [
                'name' => $name, 'slug' => Str::slug($name), 'category' => $category, 'template' => $template, 'color' => $color,
                'zone_id' => $centre->id, 'address' => 'Ganhi', 'status' => 'live', 'featured' => $i < 3, 'rating_avg' => 4.5 + $i / 10, 'rating_count' => 50 + $i * 30,
                'description' => "Boutique de démonstration {$name}.",
            ]);
            foreach ($products as [$pname, $price, $cat]) {
                $catModel = $shop->categories()->firstOrCreate(['name' => $cat]);
                $shop->products()->firstOrCreate(['name' => $pname], ['price' => $price, 'stock' => 50, 'product_category_id' => $catModel->id]);
            }
        }

        $this->testAccounts($centre);
    }

    /** Comptes de test prêts à l'emploi (mot de passe yako1234). */
    private function testAccounts(Zone $centre): void
    {
        $akpakpa = Zone::where('name', 'Akpakpa')->first() ?? $centre;
        User::firstOrCreate(['phone' => '+2290197000001'], [
            'first_name' => 'Awa', 'last_name' => 'Test', 'password' => 'yako1234', 'role' => 'client', 'zone_id' => $akpakpa->id, 'phone_verified_at' => now(),
        ]);

        $courier = User::firstOrCreate(['phone' => '+2290196000001'], [
            'first_name' => 'Patrick', 'last_name' => 'Test', 'password' => 'yako1234', 'role' => 'courier', 'zone_id' => $centre->id, 'phone_verified_at' => now(),
        ]);
        $profile = CourierProfile::firstOrCreate(['user_id' => $courier->id], [
            'vehicle_type' => 'moto', 'plate_number' => 'AB 1234 RB', 'university' => 'UAC', 'student_number' => '20231234', 'study_level' => 'Licence 3',
            'validation_status' => 'approved', 'verified_at' => now(), 'current_zone_id' => $centre->id,
        ]);
        foreach (CourierProfile::REQUIRED_DOCUMENTS as $type) {
            CourierDocument::firstOrCreate(['courier_profile_id' => $profile->id, 'type' => $type], ['path' => "demo/{$type}.jpg", 'status' => 'approved']);
        }

        $merchant = User::firstOrCreate(['phone' => '+2290195000001'], [
            'first_name' => 'Afi', 'last_name' => 'Test', 'password' => 'yako1234', 'role' => 'merchant', 'zone_id' => $centre->id, 'phone_verified_at' => now(),
        ]);
        MerchantApplication::firstOrCreate(['user_id' => $merchant->id], [
            'business_name' => 'Chez Afi', 'category' => 'alimentaire', 'zone_id' => $centre->id, 'address' => 'Marché Dantokpa', 'status' => 'approved',
        ]);
    }
}
