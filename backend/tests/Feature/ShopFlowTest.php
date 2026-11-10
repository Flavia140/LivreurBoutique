<?php

namespace Tests\Feature;

use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\MerchantApplication;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shop;
use App\Models\Tariff;
use App\Models\User;
use App\Models\Zone;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ShopFlowTest extends TestCase
{
    use RefreshDatabase;

    private Zone $shopZone;

    private Zone $clientZone;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-12 10:00', 'Africa/Porto-Novo'));
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-12 10:00', 'Africa/Porto-Novo'));
        Storage::fake('public');
        $this->shopZone = Zone::create(['name' => 'Cotonou Centre', 'city' => 'Cotonou']);
        $this->clientZone = Zone::create(['name' => 'Akpakpa', 'city' => 'Cotonou']);
        Tariff::create(['from_zone_id' => $this->shopZone->id, 'to_zone_id' => $this->clientZone->id, 'link_type' => 'intra_city', 'price' => 600, 'commission' => 100]);
        config(['yako.feexpay.base_url' => 'https://feexpay.test']);
        Http::fake([
            'feexpay.test/api/transactions/requesttopay/*' => fn () => Http::response(['reference' => 'REF'.uniqid()]),
            'feexpay.test/api/transactions/getrequesttopay/*' => Http::response(['status' => 'SUCCESSFUL']),
        ]);
    }

    private function approvedMerchant(): User
    {
        $m = User::factory()->create(['role' => 'merchant']);
        MerchantApplication::create(['user_id' => $m->id, 'business_name' => 'Africa Market', 'category' => 'alimentaire', 'zone_id' => $this->shopZone->id, 'address' => 'Ganhi', 'status' => 'approved']);

        return $m;
    }

    private function liveShopWithRice(): array
    {
        $m = $this->approvedMerchant();
        $shop = Shop::create(['merchant_id' => $m->id, 'name' => 'Africa Market', 'slug' => 'africa-market', 'category' => 'alimentaire', 'zone_id' => $this->shopZone->id, 'address' => 'Ganhi', 'status' => 'live']);
        $rice = Product::create(['shop_id' => $shop->id, 'name' => 'Riz parfumé 5kg', 'price' => 2500, 'stock' => 10]);

        return [$m, $shop, $rice];
    }

    public function test_merchant_subscribes_builds_shop_from_template_and_submits(): void
    {
        $m = $this->approvedMerchant();

        $this->actingAs($m)->postJson('/api/v1/merchant/shop/submit')->assertStatus(409);
        $this->actingAs($m)->post('/api/v1/merchant/shop', [
            'name' => 'Africa Market', 'template' => 'alimentation', 'color' => '#1E8E3E', 'logo' => UploadedFile::fake()->image('logo.png'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.template', 'alimentation')->assertJsonPath('data.status', 'draft');

        $this->actingAs($m)->postJson('/api/v1/merchant/categories', ['name' => 'Fruits & Légumes'])->assertCreated();
        $this->actingAs($m)->postJson('/api/v1/merchant/products', ['name' => 'Bananes', 'price' => 1000, 'stock' => 20])->assertCreated();

        $this->actingAs($m)->postJson('/api/v1/merchant/shop/submit')->assertStatus(402)->assertJsonPath('code', 'no_subscription');

        $sub = $this->actingAs($m)->postJson('/api/v1/merchant/subscriptions', ['plan' => 'quarterly', 'network' => 'MTN', 'phone' => '+2290197000000'])
            ->assertStatus(202)->json('data.subscription_id');
        $this->actingAs($m)->getJson("/api/v1/merchant/subscriptions/{$sub}")->assertOk()->assertJsonPath('data.status', 'active');
        $this->assertTrue($m->activeSubscription()->ends_at->equalTo(now()->addMonths(3)));

        $this->actingAs($m)->postJson('/api/v1/merchant/shop/submit')->assertOk()->assertJsonPath('data.status', 'pending_review');
    }

    public function test_client_orders_merchant_confirms_courier_delivers(): void
    {
        [$m, $shop, $rice] = $this->liveShopWithRice();
        $client = User::factory()->create();
        $courier = User::factory()->courier()->create();
        CourierProfile::create(['user_id' => $courier->id, 'vehicle_type' => 'moto', 'validation_status' => 'approved', 'available' => true, 'current_zone_id' => $this->shopZone->id]);

        $this->getJson('/api/v1/cities')->assertOk()->assertJsonPath('data.0.city', 'Cotonou');
        $this->getJson('/api/v1/shops?city=Cotonou')->assertOk()->assertJsonCount(1, 'data');

        $order = $this->actingAs($client)->postJson('/api/v1/orders', [
            'shop_id' => $shop->id, 'items' => [['product_id' => $rice->id, 'quantity' => 2]],
            'dropoff_zone_id' => $this->clientZone->id, 'dropoff_address' => 'Rue 12',
        ])->assertCreated()->assertJsonPath('data.subtotal', 5000)->assertJsonPath('data.total', 5700)->json('data');

        $deliveryId = $order['delivery']['id'];
        $this->actingAs($client)->postJson("/api/v1/deliveries/{$deliveryId}/pay", ['network' => 'MTN', 'phone' => '+2290197000000'])->assertStatus(202);
        $this->actingAs($client)->getJson("/api/v1/deliveries/{$deliveryId}/payment")->assertJsonPath('data.delivery_status', 'awaiting_merchant');
        $this->assertSame(8, $rice->fresh()->stock);

        // Pas visible des livreurs tant que le commerçant n'a pas confirmé
        $this->actingAs($courier)->getJson('/api/v1/courier/missions')->assertJsonCount(0, 'data');

        $this->actingAs($m)->getJson('/api/v1/merchant/orders?tab=in_progress')->assertJsonCount(1, 'data');
        $this->actingAs($m)->postJson("/api/v1/merchant/orders/{$order['id']}/confirm")->assertOk()->assertJsonPath('data.status', 'confirmed');

        $this->actingAs($courier)->postJson("/api/v1/courier/missions/{$deliveryId}/accept")->assertOk();
        $this->actingAs($courier)->patchJson('/api/v1/courier/location', ['lat' => 6.3654, 'lng' => 2.4183])->assertJsonPath('tracking', true);
        $this->actingAs($client)->getJson("/api/v1/orders/{$order['id']}")->assertJsonPath('data.delivery.courier_position.lat', 6.3654);

        $this->actingAs($courier)->postJson("/api/v1/courier/missions/{$deliveryId}/pickup")->assertOk();
        $this->assertSame(Order::IN_DELIVERY, Order::find($order['id'])->status);
        $code = Delivery::find($deliveryId)->confirmation_code;
        $this->actingAs($courier)->postJson("/api/v1/courier/missions/{$deliveryId}/deliver", ['code' => $code])->assertOk();

        $this->assertSame(Order::DELIVERED, Order::find($order['id'])->status);
        $this->assertSame(2, $rice->fresh()->sold_count);
        $this->actingAs($courier)->getJson('/api/v1/courier/earnings?period=day')->assertJsonPath('data.total', 600)->assertJsonPath('data.deliveries', 1);
        $this->actingAs($courier)->getJson('/api/v1/courier/dashboard')->assertJsonPath('data.today_earnings', 600);
        $this->actingAs($m)->getJson('/api/v1/merchant/dashboard')->assertJsonPath('data.month_sales', 5000)->assertJsonPath('data.month_items_sold', 2);
        $this->actingAs($client)->postJson("/api/v1/orders/{$order['id']}/rate", ['score' => 4, 'packaging' => 5])->assertCreated();
        $this->assertEquals(4.0, $shop->fresh()->rating_avg);
    }

    public function test_merchant_rejection_refunds_and_restocks(): void
    {
        [$m, $shop, $rice] = $this->liveShopWithRice();
        $client = User::factory()->create();
        $order = $this->actingAs($client)->postJson('/api/v1/orders', [
            'shop_id' => $shop->id, 'items' => [['product_id' => $rice->id, 'quantity' => 3]],
            'dropoff_zone_id' => $this->clientZone->id, 'dropoff_address' => 'Rue 12',
        ])->json('data');
        $this->actingAs($client)->postJson("/api/v1/deliveries/{$order['delivery']['id']}/pay", ['network' => 'MOOV', 'phone' => '+2290195000000']);
        $this->postJson('/api/v1/webhooks/feexpay', ['reference' => Delivery::find($order['delivery']['id'])->payments()->first()->reference]);
        $this->assertSame(7, $rice->fresh()->stock);

        $this->actingAs($m)->postJson("/api/v1/merchant/orders/{$order['id']}/reject", ['reason' => 'Rupture'])->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->assertSame(10, $rice->fresh()->stock);
        $this->assertSame('refunded', Delivery::find($order['delivery']['id'])->payments()->first()->status);
    }

    public function test_order_refuses_out_of_stock_and_closed_shop(): void
    {
        [, $shop, $rice] = $this->liveShopWithRice();
        $client = User::factory()->create();
        $payload = ['shop_id' => $shop->id, 'items' => [['product_id' => $rice->id, 'quantity' => 11]], 'dropoff_zone_id' => $this->clientZone->id, 'dropoff_address' => 'X'];
        $this->actingAs($client)->postJson('/api/v1/orders', $payload)->assertStatus(422)->assertJsonPath('code', 'out_of_stock');

        $shop->update(['status' => 'suspended']);
        $payload['items'][0]['quantity'] = 1;
        $this->actingAs($client)->postJson('/api/v1/orders', $payload)->assertStatus(409)->assertJsonPath('code', 'shop_closed');
    }

    public function test_subscription_requires_approved_merchant(): void
    {
        $m = User::factory()->create(['role' => 'merchant']);
        MerchantApplication::create(['user_id' => $m->id, 'business_name' => 'X', 'category' => 'mode', 'zone_id' => $this->shopZone->id, 'address' => 'Y']);
        $this->actingAs($m)->postJson('/api/v1/merchant/subscriptions', ['plan' => 'monthly', 'network' => 'MTN', 'phone' => '+2290197000000'])
            ->assertStatus(403)->assertJsonPath('code', 'merchant_not_approved');
    }
}
