<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\OtpCode;
use Illuminate\Support\Facades\Hash;

class OtpService
{
    public function __construct(private SmsSender $sms) {}

    public function send(string $phone, string $purpose): void
    {
        $recent = OtpCode::where('phone', $phone)->where('purpose', $purpose)
            ->where('created_at', '>', now()->subMinute())->exists();
        if ($recent) {
            throw new BusinessRuleException('Patientez une minute avant de demander un nouveau code.', 429, 'otp_throttled');
        }

        $length = config('yako.otp.length');
        $code = str_pad((string) random_int(0, 10 ** $length - 1), $length, '0', STR_PAD_LEFT);

        OtpCode::where('phone', $phone)->where('purpose', $purpose)->whereNull('used_at')->update(['used_at' => now()]);
        OtpCode::create([
            'phone' => $phone,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(config('yako.otp.ttl_minutes')),
        ]);

        $this->sms->send($phone, "YAKO : votre code est {$code}. Il expire dans ".config('yako.otp.ttl_minutes').' minutes.');
    }

    public function verify(string $phone, string $purpose, string $code): void
    {
        $otp = OtpCode::where('phone', $phone)->where('purpose', $purpose)
            ->whereNull('used_at')->where('expires_at', '>', now())->latest('id')->first();

        if (! $otp || $otp->attempts >= config('yako.otp.max_attempts')) {
            throw new BusinessRuleException('Code expiré. Demandez un nouveau code.', 422, 'otp_expired');
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            throw new BusinessRuleException('Code incorrect.', 422, 'otp_invalid');
        }

        $otp->update(['used_at' => now()]);
    }
}
