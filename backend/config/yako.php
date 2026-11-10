<?php

return [
    // Mode démonstration (tests sans FeexPay ni SMS) : paiements validés d'office, code SMS 123456.
    // Ignoré si APP_ENV=production.
    'demo' => env('YAKO_DEMO', false) && env('APP_ENV') !== 'production',

    // Plage horaire de prise en charge et de livraison (heure du Bénin)
    'service_hours' => [
        'start' => env('YAKO_SERVICE_START', '07:00'),
        'end' => env('YAKO_SERVICE_END', '21:00'),
    ],

    // Paiement à la livraison : accepté sous ce montant (FCFA). Modifiable dans l'admin (table settings).
    'cash_limit' => (int) env('YAKO_CASH_LIMIT', 20000),

    'cancellation_fee' => (int) env('YAKO_CANCELLATION_FEE', 300), // FCFA, quand le livreur est déjà en route

    'otp' => [
        'length' => 6,
        'ttl_minutes' => 10,
        'max_attempts' => 5,
    ],

    'sms' => [
        'driver' => env('YAKO_SMS_DRIVER', 'log'), // log, http
        'http_url' => env('YAKO_SMS_HTTP_URL'),
        'http_token' => env('YAKO_SMS_HTTP_TOKEN'),
        'sender' => env('YAKO_SMS_SENDER', 'YAKO'),
    ],

    'feexpay' => [
        'base_url' => env('FEEXPAY_BASE_URL', 'https://api.feexpay.me'),
        'shop_id' => env('FEEXPAY_SHOP_ID'),
        'token' => env('FEEXPAY_TOKEN'),
        'mode' => env('FEEXPAY_MODE', 'SANDBOX'),
    ],

    // Abonnements commerçants (FCFA)
    'plans' => [
        'monthly' => ['label' => 'Mensuel', 'amount' => 9900, 'months' => 1],
        'quarterly' => ['label' => 'Trimestriel', 'amount' => 24900, 'months' => 3],
        'annual' => ['label' => 'Annuel', 'amount' => 89900, 'months' => 12],
    ],

    // Suspension automatique : note moyenne < 3 sur les 10 dernières livraisons
    'auto_suspend' => ['window' => 10, 'min_average' => 3.0],
];
