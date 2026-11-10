<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CourierController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\MerchantController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ZoneController;
use App\Models\Setting;
use App\Services\FeexPayClient;
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
    Route::get('payment-options', fn () => response()->json(['data' => ['cash_limit' => Setting::cashLimit(), 'networks' => FeexPayClient::NETWORKS]]));

    Route::get('cities', [CatalogController::class, 'cities']);
    Route::get('shops', [CatalogController::class, 'shops']);
    Route::get('shops/{shop}', [CatalogController::class, 'shop']);
    Route::get('shops/{shop}/products', [CatalogController::class, 'shopProducts']);
    Route::get('products/{product}', [CatalogController::class, 'product']);
    Route::get('search', [CatalogController::class, 'search']);
    Route::get('merchant/plans', [MerchantController::class, 'plans']);

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
            Route::post('deliveries/{delivery}/pay-cash', [DeliveryController::class, 'payCash']);
            Route::get('deliveries/{delivery}/payment', [PaymentController::class, 'status']);
            Route::post('deliveries/{delivery}/cancel', [DeliveryController::class, 'cancel']);
            Route::post('deliveries/{delivery}/rate', [DeliveryController::class, 'rate']);
            Route::get('orders', [OrderController::class, 'index']);
            Route::post('orders', [OrderController::class, 'store']);
            Route::get('orders/{order}', [OrderController::class, 'show']);
            Route::post('orders/{order}/rate', [OrderController::class, 'rate']);
        });

        Route::middleware('role:merchant')->prefix('merchant')->group(function () {
            Route::get('dashboard', [MerchantController::class, 'dashboard']);
            Route::post('subscriptions', [MerchantController::class, 'subscribe']);
            Route::get('subscriptions/{subscription}', [MerchantController::class, 'subscriptionStatus']);
            Route::get('shop', [MerchantController::class, 'show']);
            Route::post('shop', [MerchantController::class, 'saveShop']);
            Route::post('shop/submit', [MerchantController::class, 'submitShop']);
            Route::post('categories', [MerchantController::class, 'addCategory']);
            Route::delete('categories/{category}', [MerchantController::class, 'deleteCategory']);
            Route::get('products', [MerchantController::class, 'products']);
            Route::post('products', [MerchantController::class, 'storeProduct']);
            Route::get('products/{product}', [MerchantController::class, 'showProduct']);
            Route::post('products/{product}', [MerchantController::class, 'updateProduct']);
            Route::delete('products/{product}', [MerchantController::class, 'deleteProduct']);
            Route::get('orders', [MerchantController::class, 'orders']);
            Route::post('orders/{order}/confirm', [MerchantController::class, 'confirmOrder']);
            Route::post('orders/{order}/reject', [MerchantController::class, 'rejectOrder']);
        });

        Route::middleware('role:courier')->prefix('courier')->group(function () {
            Route::post('documents', [CourierController::class, 'uploadDocument']);
            Route::patch('availability', [CourierController::class, 'availability']);
            Route::get('dashboard', [CourierController::class, 'dashboard']);
            Route::get('earnings', [CourierController::class, 'earnings']);
            Route::patch('location', [CourierController::class, 'location']);
            Route::get('missions', [CourierController::class, 'openMissions']);
            Route::get('missions/current', [CourierController::class, 'current']);
            Route::post('missions/{delivery}/accept', [CourierController::class, 'accept']);
            Route::post('missions/{delivery}/pickup', [CourierController::class, 'pickup']);
            Route::post('missions/{delivery}/deliver', [CourierController::class, 'deliver']);
        });
    });
});
