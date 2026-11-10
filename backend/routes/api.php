<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CourierController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ZoneController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public
    Route::post('auth/otp', [AuthController::class, 'requestOtp'])->middleware('throttle:10,1');
    Route::post('auth/register/client', [AuthController::class, 'registerClient']);
    Route::post('auth/register/courier', [AuthController::class, 'registerCourier']);
    Route::post('auth/register/merchant', [AuthController::class, 'registerMerchant']);
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('auth/password/reset', [AuthController::class, 'resetPassword']);

    Route::get('zones', [ZoneController::class, 'index']);
    Route::get('tariffs/quote', [ZoneController::class, 'quote']);
    Route::get('service-hours', [ZoneController::class, 'serviceHours']);

    Route::post('webhooks/feexpay', [PaymentController::class, 'webhook']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('devices', [DeviceController::class, 'store']);

        Route::get('deliveries', [DeliveryController::class, 'index']);
        Route::get('deliveries/{delivery}', [DeliveryController::class, 'show']);

        Route::middleware('role:client')->group(function () {
            Route::post('deliveries', [DeliveryController::class, 'store']);
            Route::post('deliveries/{delivery}/pay', [PaymentController::class, 'pay']);
            Route::get('deliveries/{delivery}/payment', [PaymentController::class, 'status']);
            Route::post('deliveries/{delivery}/cancel', [DeliveryController::class, 'cancel']);
            Route::post('deliveries/{delivery}/rate', [DeliveryController::class, 'rate']);
        });

        Route::middleware('role:courier')->prefix('courier')->group(function () {
            Route::post('documents', [CourierController::class, 'uploadDocument']);
            Route::patch('availability', [CourierController::class, 'availability']);
            Route::get('missions', [CourierController::class, 'openMissions']);
            Route::get('missions/current', [CourierController::class, 'current']);
            Route::post('missions/{delivery}/accept', [CourierController::class, 'accept']);
            Route::post('missions/{delivery}/pickup', [CourierController::class, 'pickup']);
            Route::post('missions/{delivery}/deliver', [CourierController::class, 'deliver']);
        });
    });
});
