<?php

namespace Tests\Feature;

use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\Tariff;
use App\Models\User;
use App\Models\Zone;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DeliveryFlowTest extends TestCase
{
    use RefreshDatabase;

    private Zone $a;

    private Zone $b;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-12 10:00', 'Africa/Porto-Novo'));
        Carbon::setTestNow(Carbon::parse('2026-11-12 10:00', 'Africa/Porto-Novo'));
        $this->a = Zone::create(['name' => 'Cotonou Centre', 'city' => 'Cotonou']);
        $this->b = Zone::create(['name' => 'Akpakpa', 'city' => 'Cotonou']);
        Tariff::create(['from_zone_id' => $this->a->id, 'to_zone_id' => $this->b->id, 'link_type' => 'intra_city', 'price' => 800, 'commission' => 100]);
        config(['yako.feexpay.base_url' => 'https://feexpay.test']);
        Http::fake([
            'feexpay.test/api/transactions/requesttopay/*' => fn () => Http::response(['reference' => 'REF'.uniqid(), 'status' => 'PENDING']),
            'feexpay.test/api/transactions/getrequesttopay/*' => Http::response(['status' => 'SUCCESSFUL', 'amount' => 900, 'payer' => ['partyId' => '22997000000']]),
        ]);
    }

    private function courier(): User
    {
        $u = User::factory()->courier()->create();
        CourierProfile::create(['user_id' => $u->id, 'vehicle_type' => 'moto', 'validation_status' => 'approved', 'available' => true, 'current_zone_id' => $this->a->id]);

        return $u;
    }

    private function paidDelivery(User $client): Delivery
    {
        $id = $this->actingAs($client)->postJson('/api/v1/deliveries', [
            'pickup_zone_id' => $this->a->id, 'pickup_address' => 'Marché Dantokpa', 'dropoff_zone_id' => $this->b->id,
            'dropoff_address' => 'Carrefour Akpakpa', 'recipient_phone' => '+2290196000000', 'parcel_type' => 'document',
        ])->assertCreated()->assertJsonPath('data.total', 900)->json('data.id');

        $this->actingAs($client)->postJson("/api/v1/deliveries/{$id}/pay", ['network' => 'MTN', 'phone' => '+2290197000000'])->assertStatus(202);
        $delivery = Delivery::findOrFail($id);
        $this->postJson('/api/v1/webhooks/feexpay', ['reference' => $delivery->payments()->first()->reference])->assertOk();

        return $delivery->fresh();
    }

    public function test_full_delivery_flow_releases_funds_with_code(): void
    {
        $client = User::factory()->create();
        $courier = $this->courier();
        $delivery = $this->paidDelivery($client);
        $this->assertSame(Delivery::PENDING, $delivery->status);
        $this->assertSame('held', $delivery->payments()->first()->status);

        $this->actingAs($courier)->getJson('/api/v1/courier/missions')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($courier)->postJson("/api/v1/courier/missions/{$delivery->id}/accept")->assertOk()->assertJsonPath('data.status', 'accepted');
        $this->actingAs($courier)->postJson("/api/v1/courier/missions/{$delivery->id}/pickup")->assertOk();

        $wrong = $delivery->confirmation_code === '1000' ? '1001' : '1000';
        $this->actingAs($courier)->postJson("/api/v1/courier/missions/{$delivery->id}/deliver", ['code' => $wrong])->assertStatus(422);
        $this->actingAs($courier)->postJson("/api/v1/courier/missions/{$delivery->id}/deliver", ['code' => $delivery->confirmation_code])
            ->assertOk()->assertJsonPath('data.status', 'delivered');

        $this->assertSame('released', $delivery->payments()->first()->status);
        $this->actingAs($client)->postJson("/api/v1/deliveries/{$delivery->id}/rate", ['score' => 5])->assertCreated();
        $this->assertEquals(5.0, $courier->courierProfile->fresh()->rating_avg);
    }

    public function test_webhook_twice_does_not_double_process(): void
    {
        $delivery = $this->paidDelivery(User::factory()->create());
        $this->postJson('/api/v1/webhooks/feexpay', ['reference' => $delivery->payments()->first()->reference])->assertOk();
        $this->assertSame(1, $delivery->payments()->where('status', 'held')->count());
    }

    public function test_second_courier_cannot_take_same_mission(): void
    {
        $delivery = $this->paidDelivery(User::factory()->create());
        $c1 = $this->courier();
        $c2 = $this->courier();
        $this->actingAs($c1)->postJson("/api/v1/courier/missions/{$delivery->id}/accept")->assertOk();
        $this->actingAs($c2)->postJson("/api/v1/courier/missions/{$delivery->id}/accept")->assertStatus(409);
    }

    public function test_courier_cannot_accept_outside_service_hours(): void
    {
        $delivery = $this->paidDelivery(User::factory()->create());
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-12 21:30', 'Africa/Porto-Novo'));
        $this->actingAs($this->courier())->postJson("/api/v1/courier/missions/{$delivery->id}/accept")
            ->assertStatus(403)->assertJsonPath('code', 'outside_service_hours');
    }

    public function test_cancellation_is_free_before_acceptance_and_charged_after(): void
    {
        $client = User::factory()->create();
        $d1 = $this->paidDelivery($client);
        $this->actingAs($client)->postJson("/api/v1/deliveries/{$d1->id}/cancel")->assertOk()->assertJsonPath('data.cancellation_fee', 0);
        $this->assertSame('refunded', $d1->payments()->first()->status);

        $d2 = $this->paidDelivery($client);
        $this->actingAs($this->courier())->postJson("/api/v1/courier/missions/{$d2->id}/accept")->assertOk();

        $this->actingAs($client)->postJson("/api/v1/deliveries/{$d2->id}/cancel")->assertOk()->assertJsonPath('data.cancellation_fee', 300);
    }

    public function test_courier_is_suspended_after_ten_bad_ratings(): void
    {
        $courier = $this->courier();
        $client = User::factory()->create();
        for ($i = 0; $i < 10; $i++) {
            $d = Delivery::create([
                'code' => "YKTEST{$i}", 'client_id' => $client->id, 'courier_id' => $courier->id, 'pickup_zone_id' => $this->a->id,
                'pickup_address' => 'X', 'dropoff_zone_id' => $this->b->id, 'dropoff_address' => 'Y', 'recipient_phone' => '+2290100000000',
                'parcel_type' => 'other', 'price' => 800, 'commission' => 100, 'total' => 900, 'status' => 'delivered', 'confirmation_code' => '1234',
            ]);
            $this->actingAs($client)->postJson("/api/v1/deliveries/{$d->id}/rate", ['score' => 2])->assertCreated();
        }
        $this->assertSame('suspended', $courier->fresh()->status);
    }

    public function test_unknown_route_between_zones_is_refused(): void
    {
        $c = Zone::create(['name' => 'Parakou Centre', 'city' => 'Parakou']);
        $this->getJson("/api/v1/tariffs/quote?from={$this->a->id}&to={$c->id}")->assertStatus(422)->assertJsonPath('code', 'no_tariff');
        $this->getJson("/api/v1/tariffs/quote?from={$this->b->id}&to={$this->a->id}")->assertOk()->assertJsonPath('data.total', 900);
    }
}
