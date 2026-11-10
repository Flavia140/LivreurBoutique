<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AuthController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/admin');

Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('login', [AuthController::class, 'form'])->name('login');
    Route::post('login', [AuthController::class, 'login'])->name('login.submit');
    Route::post('logout', [AuthController::class, 'logout'])->name('logout');

    Route::middleware(['auth', 'admin'])->group(function () {
        Route::get('/', [AdminController::class, 'dashboard'])->name('dashboard');
        Route::get('couriers', [AdminController::class, 'couriers'])->name('couriers');
        Route::get('couriers/{courier}', [AdminController::class, 'courier'])->name('courier');
        Route::post('couriers/{courier}/decision', [AdminController::class, 'decideCourier'])->name('courier.decide');
        Route::get('documents/{document}', [AdminController::class, 'courierDocument'])->name('courier.document');
        Route::get('merchants', [AdminController::class, 'merchants'])->name('merchants');
        Route::post('merchants/{application}/decision', [AdminController::class, 'decideMerchant'])->name('merchant.decide');
        Route::get('merchants/{application}/documents/{index}', [AdminController::class, 'merchantDocument'])->name('merchant.document');
        Route::get('shops', [AdminController::class, 'shops'])->name('shops');
        Route::post('shops/{shop}/status', [AdminController::class, 'setShopStatus'])->name('shop.status');
        Route::get('zones', [AdminController::class, 'zones'])->name('zones');
        Route::post('zones', [AdminController::class, 'storeZone'])->name('zones.store');
        Route::post('zones/{zone}/toggle', [AdminController::class, 'toggleZone'])->name('zones.toggle');
        Route::post('tariffs', [AdminController::class, 'saveTariff'])->name('tariffs.save');
        Route::get('settings', [AdminController::class, 'settings'])->name('settings');
        Route::post('settings', [AdminController::class, 'saveSettings'])->name('settings.save');
        Route::get('cash', [AdminController::class, 'cash'])->name('cash');
        Route::post('cash/{courier}/remit', [AdminController::class, 'remitCash'])->name('cash.remit');
        Route::get('users', [AdminController::class, 'users'])->name('users');
        Route::post('users/{user}/toggle', [AdminController::class, 'toggleUser'])->name('users.toggle');
    });
});
