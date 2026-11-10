<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('payment_method', 20)->default('mobile_money')->after('total'); // mobile_money, cash
            $table->timestamp('cash_collected_at')->nullable();
            $table->timestamp('cash_remitted_at')->nullable();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::table('deliveries', fn (Blueprint $t) => $t->dropColumn(['payment_method', 'cash_collected_at', 'cash_remitted_at']));
    }
};
