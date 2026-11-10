<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->timestamp('arrived_pickup_at')->nullable();
            $table->timestamp('arrived_dropoff_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', fn (Blueprint $t) => $t->dropColumn(['arrived_pickup_at', 'arrived_dropoff_at']));
    }
};
