<?php

namespace Tests\Feature;

use App\Models\CourierDocument;
use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\MerchantApplication;
use App\Models\Setting;
use App\Models\Shop;
use App\Models\Tariff;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private Zone $a;

    private Zone $b;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Zone::create(['name' => 'Cotonou Centre', 'city' => 'Cotonou']);
        $this->b = Zone::create(['name' => 'Akpakpa', 'city' => 'Cotonou']);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'phone' => '+2290100000001', 'password' => 'admin-pass']);
    }

    public function test_only_admins_can_sign_in_and_reach_the_back_office(): void
    {
        $this->get('/admin')->assertRedirect('/admin/login');
        $client = User::factory()->create(['phone' => '+2290100000002', 'password' => 'client-pass']);
        $this->post('/admin/login', ['phone' => '0100000002', 'password' => 'client-pass'])->assertSessionHasErrors('phone');
        $this->assertGuest();

        $this->admin();
        $this->post('/admin/login', ['phone' => '01 00 00 00 01', 'password' => 'admin-pass'])->assertRedirect('/admin');
        $this->get('/admin')->assertOk()->assertSee('Tableau de bord');

        $this->actingAs($client)->get('/admin/couriers')->assertRedirect('/admin/login');
    }

    public function test_courier_validation_requires_a_complete_file(): void
    {
        $admin = $this->admin();
        $u = User::factory()->create(['role' => 'courier']);
        $profile = CourierProfile::create(['user_id' => $u->id, 'vehicle_type' => 'moto']);

        $this->actingAs($admin)->get("/admin/couriers/{$profile->id}")->assertOk()->assertSee('Manquant');
        $this->actingAs($admin)->post("/admin/couriers/{$profile->id}/decision", ['decision' => 'approve'])->assertSessionHasErrors('decision');

        foreach (CourierProfile::REQUIRED_DOCUMENTS as $type) {
            CourierDocument::create(['courier_profile_id' => $profile->id, 'type' => $type, 'path' => "couriers/{$type}.jpg"]);
        }
        $this->actingAs($admin)->post("/admin/couriers/{$profile->id}/decision", ['decision' => 'approve'])->assertRedirect('/admin/couriers');
        $this->assertSame('approved', $profile->fresh()->validation_status);

        $this->actingAs($admin)->post("/admin/couriers/{$profile->id}/decision", ['decision' => 'reject'])->assertSessionHasErrors('reason');
    }

    public function test_merchant_and_shop_go_live_through_the_admin(): void
    {
        $admin = $this->admin();
        $m = User::factory()->create(['role' => 'merchant']);
        $app = MerchantApplication::create(['user_id' => $m->id, 'business_name' => 'Chez Afi', 'category' => 'alimentaire', 'zone_id' => $this->a->id, 'address' => 'Dantokpa']);
        $this->actingAs($admin)->get('/admin/merchants')->assertOk()->assertSee('Chez Afi');
        $this->actingAs($admin)->post("/admin/merchants/{$app->id}/decision", ['decision' => 'approve'])->assertRedirect();
        $this->assertSame('approved', $app->fresh()->status);

        $shop = Shop::create(['merchant_id' => $m->id, 'name' => 'Chez Afi', 'slug' => 'chez-afi', 'category' => 'alimentaire', 'zone_id' => $this->a->id, 'address' => 'Dantokpa', 'status' => 'pending_review']);
        $this->actingAs($admin)->get('/admin/shops')->assertOk()->assertSee('Chez Afi');
        $this->actingAs($admin)->post("/admin/shops/{$shop->id}/status", ['status' => 'live'])->assertRedirect();
        $this->assertSame('live', $shop->fresh()->status);
        $this->getJson('/api/v1/shops')->assertJsonPath('data.0.name', 'Chez Afi');
    }

    public function test_tariffs_zones_and_cash_limit_are_editable(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post('/admin/tariffs', ['from_zone_id' => $this->b->id, 'to_zone_id' => $this->a->id, 'link_type' => 'intra_city', 'price' => 700, 'commission' => 150])->assertRedirect();
        $this->actingAs($admin)->post('/admin/tariffs', ['from_zone_id' => $this->a->id, 'to_zone_id' => $this->b->id, 'link_type' => 'intra_city', 'price' => 800, 'commission' => 150])->assertRedirect();
        $this->assertSame(1, Tariff::count());
        $this->getJson("/api/v1/tariffs/quote?from={$this->a->id}&to={$this->b->id}")->assertJsonPath('data.total', 950);

        $this->actingAs($admin)->post('/admin/zones', ['city' => 'Ouidah', 'name' => 'Ouidah Centre'])->assertRedirect();
        $this->assertDatabaseHas('zones', ['name' => 'Ouidah Centre']);
        $this->actingAs($admin)->get('/admin/zones')->assertOk()->assertSee('Ouidah Centre');

        $this->actingAs($admin)->post('/admin/settings', ['cash_limit' => 15000])->assertRedirect();
        $this->assertSame(15000, Setting::cashLimit());
        $this->getJson('/api/v1/payment-options')->assertJsonPath('data.cash_limit', 15000);
    }

    public function test_cash_owed_by_couriers_can_be_marked_as_remitted(): void
    {
        $admin = $this->admin();
        $courier = User::factory()->create(['role' => 'courier', 'first_name' => 'David']);
        $client = User::factory()->create();
        foreach ([1, 2] as $i) {
            Delivery::create([
                'code' => "YKCASH{$i}", 'client_id' => $client->id, 'courier_id' => $courier->id, 'pickup_zone_id' => $this->a->id, 'pickup_address' => 'X',
                'dropoff_zone_id' => $this->b->id, 'dropoff_address' => 'Y', 'recipient_phone' => '+2290100000000', 'parcel_type' => 'other',
                'price' => 800, 'commission' => 100, 'total' => 6900, 'payment_method' => 'cash', 'cash_collected_at' => now(), 'status' => 'delivered', 'confirmation_code' => '1234',
            ]);
        }
        $this->actingAs($admin)->get('/admin/cash')->assertOk()->assertSee('David')->assertSee('12 200');
        $this->actingAs($admin)->get('/admin')->assertSee('12 200');
        $this->actingAs($admin)->post("/admin/cash/{$courier->id}/remit")->assertRedirect();
        $this->assertSame(0, Delivery::whereNull('cash_remitted_at')->count());
        $this->actingAs($admin)->get('/admin/cash')->assertSee('Rien à récupérer');
    }

    public function test_admin_can_suspend_an_account(): void
    {
        $admin = $this->admin();
        $u = User::factory()->create();
        $this->actingAs($admin)->post("/admin/users/{$u->id}/toggle")->assertRedirect();
        $this->assertSame('suspended', $u->fresh()->status);
        $this->actingAs($admin)->post("/admin/users/{$admin->id}/toggle")->assertForbidden();
    }
}
