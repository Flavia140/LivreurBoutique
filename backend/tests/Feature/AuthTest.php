<?php

namespace Tests\Feature;

use App\Models\OtpCode;
use App\Models\User;
use App\Models\Zone;
use App\Services\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private ?string $lastSms = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->instance(SmsSender::class, new class($this) extends SmsSender
        {
            public function __construct(private $test) {}

            public function send(string $phone, string $message): void
            {
                $this->test->captureSms($message);
            }
        });
    }

    public function captureSms(string $message): void
    {
        $this->lastSms = $message;
    }

    private function otpFor(string $phone): string
    {
        $this->postJson('/api/v1/auth/otp', ['phone' => $phone, 'purpose' => 'register'])->assertOk();
        preg_match('/(\d{6})/', $this->lastSms, $m);

        return $m[1];
    }

    private function base(string $phone): array
    {
        return [
            'phone' => $phone, 'code' => $this->otpFor($phone), 'first_name' => 'Awa', 'last_name' => 'Dossou',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ];
    }

    public function test_client_signs_up_with_sms_code_then_logs_in(): void
    {
        $zone = Zone::create(['name' => 'Akpakpa', 'city' => 'Cotonou']);

        $this->postJson('/api/v1/auth/register/client', $this->base('+2290197000001') + ['zone_id' => $zone->id, 'address' => 'Rue 12'])
            ->assertCreated()->assertJsonPath('user.role', 'client')->assertJsonStructure(['token']);

        $this->postJson('/api/v1/auth/login', ['phone' => '+2290197000001', 'password' => 'secret123'])->assertOk();
        $this->postJson('/api/v1/auth/login', ['phone' => '+2290197000001', 'password' => 'mauvais'])->assertStatus(401);
    }

    public function test_wrong_code_is_rejected(): void
    {
        $zone = Zone::create(['name' => 'Akpakpa', 'city' => 'Cotonou']);
        $data = $this->base('+2290197000002');
        $data['code'] = $data['code'] === '000000' ? '111111' : '000000';

        $this->postJson('/api/v1/auth/register/client', $data + ['zone_id' => $zone->id, 'address' => 'Rue 12'])
            ->assertStatus(422)->assertJsonPath('code', 'otp_invalid');
        $this->assertSame(1, OtpCode::first()->attempts);
    }

    public function test_courier_signs_up_and_must_upload_documents(): void
    {
        $zone = Zone::create(['name' => 'Akpakpa', 'city' => 'Cotonou']);

        $res = $this->postJson('/api/v1/auth/register/courier', $this->base('+2290197000003') + [
            'zone_id' => $zone->id, 'university' => 'UAC', 'student_number' => 'UAC-21-INFO-1256', 'study_level' => 'Licence 3', 'vehicle_type' => 'moto', 'plate_number' => 'AB1234RB',
        ])->assertCreated()->assertJsonPath('user.courier.validation_status', 'pending');
        $this->assertCount(7, $res->json('user.courier.missing_documents'));

        $this->withToken($res->json('token'))
            ->post('/api/v1/courier/documents', ['type' => 'student_card', 'file' => UploadedFile::fake()->image('carte.jpg')], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonCount(6, 'missing_documents');

        // Non validé : pas d'accès aux missions
        $this->withToken($res->json('token'))->getJson('/api/v1/courier/missions')->assertStatus(403);
    }

    public function test_merchant_signs_up_with_pending_application(): void
    {
        $zone = Zone::create(['name' => 'Cotonou Centre', 'city' => 'Cotonou']);

        $this->post('/api/v1/auth/register/merchant', $this->base('+2290197000004') + [
            'business_name' => 'Boutique Mode Cotonou', 'category' => 'mode', 'zone_id' => $zone->id, 'address' => 'Ganhi',
            'documents' => [UploadedFile::fake()->create('rccm.pdf', 100, 'application/pdf')],
        ], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('user.role', 'merchant')->assertJsonPath('user.merchant.status', 'pending');
    }

    public function test_phone_already_used_cannot_request_register_code(): void
    {
        User::factory()->create(['phone' => '+2290197000005']);
        $this->postJson('/api/v1/auth/otp', ['phone' => '+2290197000005', 'purpose' => 'register'])->assertStatus(409);
    }
}
