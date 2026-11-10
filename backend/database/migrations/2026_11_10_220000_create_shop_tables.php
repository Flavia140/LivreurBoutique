<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category', 40);
            $table->string('template', 20)->default('general'); // mode, alimentation, electronique, general
            $table->string('color', 7)->default('#FF6B00');
            $table->string('logo_path')->nullable();
            $table->string('banner_path')->nullable();
            $table->text('description')->nullable();
            $table->foreignId('zone_id')->constrained('zones');
            $table->string('address');
            $table->json('opening_hours')->nullable();
            $table->unsignedSmallInteger('prep_minutes')->default(20);
            $table->decimal('rating_avg', 3, 2)->nullable();
            $table->unsignedInteger('rating_count')->default(0);
            $table->boolean('featured')->default(false);
            $table->string('status', 20)->default('draft'); // draft, pending_review, live, suspended
            $table->timestamps();
            $table->index(['status', 'category']);
        });

        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('price');
            $table->unsignedInteger('promo_price')->nullable();
            $table->unsignedInteger('stock')->nullable(); // null = illimité
            $table->string('image_path')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sold_count')->default(0);
            $table->timestamps();
            $table->index(['shop_id', 'active']);
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('users')->cascadeOnDelete();
            $table->string('plan', 20); // monthly, quarterly, annual
            $table->unsignedInteger('amount');
            $table->string('status', 20)->default('awaiting_payment'); // awaiting_payment, active, expired, cancelled
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('code', 12)->unique();
            $table->foreignId('client_id')->constrained('users');
            $table->foreignId('shop_id')->constrained();
            $table->string('status', 24)->default('awaiting_payment'); // awaiting_payment, pending_confirmation, confirmed, in_delivery, delivered, rejected, cancelled
            $table->unsignedInteger('subtotal');
            $table->text('rejection_reason')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->unsignedInteger('unit_price');
            $table->unsignedSmallInteger('quantity');
            $table->unsignedInteger('line_total');
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->after('code')->constrained()->nullOnDelete();
            $table->unsignedInteger('goods_amount')->default(0)->after('commission');
            $table->decimal('courier_lat', 10, 7)->nullable();
            $table->decimal('courier_lng', 10, 7)->nullable();
            $table->timestamp('location_at')->nullable();
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('delivery_id')->nullable()->change();
            $table->foreignId('subscription_id')->nullable()->after('delivery_id')->constrained()->nullOnDelete();
        });

        Schema::table('courier_profiles', function (Blueprint $table) {
            $table->string('student_number', 40)->nullable()->after('university');
            $table->string('study_level', 30)->nullable()->after('student_number');
        });

        Schema::create('shop_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('users');
            $table->unsignedTinyInteger('score');
            $table->unsignedTinyInteger('conformity')->nullable();
            $table->unsignedTinyInteger('presentation')->nullable();
            $table->unsignedTinyInteger('packaging')->nullable();
            $table->text('comment')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_ratings');
        Schema::table('courier_profiles', fn (Blueprint $t) => $t->dropColumn(['student_number', 'study_level']));
        Schema::table('payments', fn (Blueprint $t) => $t->dropConstrainedForeignId('subscription_id'));
        Schema::table('deliveries', function (Blueprint $t) {
            $t->dropConstrainedForeignId('order_id');
            $t->dropColumn(['goods_amount', 'courier_lat', 'courier_lng', 'location_at']);
        });
        foreach (['order_items', 'orders', 'subscriptions', 'products', 'product_categories', 'shops'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
