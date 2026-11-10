<?php

namespace Tests\Feature;

use App\Services\FeexPayClient;
use App\Services\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DemoModeTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_mode_fakes_payments_and_sms_codes(): void
    {
        config(['yako.demo' => true]);
        Http::fake();

        $pay = app(FeexPayClient::class);
        $ref = $pay->requestToPay(900, '+2290197000000', 'MTN', 'Test')['reference'];
        $this->assertStringStartsWith('DEMO-', $ref);
        $this->assertSame('SUCCESSFUL', $pay->status($ref)['status']);
        Http::assertNothingSent();

        app(OtpService::class)->send('+2290197000000', 'register');
        app(OtpService::class)->verify('+2290197000000', 'register', '123456');
        $this->assertTrue(true);
    }
}
