<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Envoi de SMS. Pilote "log" en développement ; "http" pour un fournisseur local (à brancher). */
class SmsSender
{
    public function send(string $phone, string $message): void
    {
        if (config('yako.sms.driver') === 'http') {
            Http::withToken(config('yako.sms.http_token'))
                ->timeout(10)
                ->post(config('yako.sms.http_url'), [
                    'to' => $phone,
                    'from' => config('yako.sms.sender'),
                    'message' => $message,
                ])->throw();

            return;
        }

        Log::info('SMS', ['to' => $phone, 'message' => $message]);
    }
}
