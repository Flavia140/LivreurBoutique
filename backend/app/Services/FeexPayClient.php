<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use Illuminate\Support\Facades\Http;

/**
 * Client FeexPay (Mobile Money MTN / Moov).
 * Points d'accès repris du SDK PHP officiel : https://github.com/foxinnovs/feexpay-sdk-php
 * À vérifier sur docs.feexpay.me avec les identifiants sandbox avant la mise en production.
 */
class FeexPayClient
{
    public const NETWORKS = ['MTN', 'MOOV'];

    /** Lance une demande de paiement ; renvoie la référence FeexPay. */
    public function requestToPay(int $amount, string $phone, string $network, string $fullName, ?string $email = null): array
    {
        if (config('yako.demo')) {
            return ['reference' => 'DEMO-'.bin2hex(random_bytes(6)), 'status' => 'PENDING'];
        }
        $response = Http::asForm()->timeout(20)
            ->post($this->url('/api/transactions/requesttopay/integration'), [
                'phoneNumber' => $this->localNumber($phone),
                'amount' => $amount,
                'reseau' => $network,
                'token' => config('yako.feexpay.token'),
                'shop' => config('yako.feexpay.shop_id'),
                'first_name' => $fullName,
                'email' => $email ?? 'client@yako.bj',
            ]);

        $data = $response->json() ?? [];

        if ($response->failed() || ($data['status'] ?? null) === 'FAILED' || empty($data['reference'])) {
            throw new BusinessRuleException("Le paiement n'a pas pu être lancé. Vérifiez le numéro Mobile Money.", 422, 'payment_failed');
        }

        return $data;
    }

    /** Statut normalisé : SUCCESSFUL, FAILED ou PENDING. */
    public function status(string $reference): array
    {
        if (config('yako.demo') && str_starts_with($reference, 'DEMO-')) {
            return ['status' => 'SUCCESSFUL', 'amount' => null, 'raw' => ['demo' => true]];
        }
        $data = Http::timeout(20)
            ->get($this->url('/api/transactions/getrequesttopay/integration/'.rawurlencode($reference)))
            ->json() ?? [];

        return [
            'status' => strtoupper((string) ($data['status'] ?? 'PENDING')),
            'amount' => isset($data['amount']) ? (int) $data['amount'] : null,
            'raw' => $data,
        ];
    }

    private function url(string $path): string
    {
        return rtrim(config('yako.feexpay.base_url'), '/').$path;
    }

    /** FeexPay attend le numéro avec indicatif sans le "+". */
    private function localNumber(string $phone): string
    {
        return ltrim($phone, '+');
    }
}
