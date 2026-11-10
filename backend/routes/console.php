<?php

use App\Models\Delivery;
use App\Services\DeliveryService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// À l'ouverture du créneau, on propose aux livreurs les courses payées pendant la nuit.
Artisan::command('yako:dispatch-overnight', function (DeliveryService $service) {
    $deliveries = Delivery::with('pickupZone', 'dropoffZone')->where('status', Delivery::PENDING)->whereNull('courier_id')->get();
    $deliveries->each(fn ($d) => $service->notifyCouriers($d));
    $this->info("{$deliveries->count()} course(s) proposée(s).");
})->purpose('Propose les courses en attente aux livreurs');

Schedule::command('yako:dispatch-overnight')->dailyAt(config('yako.service_hours.start'))->timezone('Africa/Porto-Novo');
