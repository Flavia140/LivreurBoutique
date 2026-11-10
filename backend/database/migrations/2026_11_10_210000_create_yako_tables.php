<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20)->index();
            $table->string('purpose', 20)->default('register'); // register, reset
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('zones', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city');
            $table->string('department')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('zones')->nullOnDelete();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['city', 'name']);
        });

        Schema::create('tariffs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_zone_id')->constrained('zones')->cascadeOnDelete();
            $table->foreignId('to_zone_id')->constrained('zones')->cascadeOnDelete();
            $table->string('link_type', 30); // same_area, intra_city, intercity_short, intercity_medium, intercity_long
            $table->unsignedInteger('price'); // FCFA
            $table->unsignedInteger('commission'); // FCFA
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['from_zone_id', 'to_zone_id']);
        });

        Schema::create('courier_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('vehicle_type', 10); // moto, voiture
            $table->string('plate_number')->nullable();
            $table->string('university')->nullable();
            $table->string('validation_status', 20)->default('pending'); // pending, approved, rejected
            $table->text('rejection_reason')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->boolean('available')->default(false);
            $table->foreignId('current_zone_id')->nullable()->constrained('zones')->nullOnDelete();
            $table->decimal('rating_avg', 3, 2)->nullable();
            $table->unsignedInteger('rating_count')->default(0);
            $table->timestamps();
        });

        Schema::create('courier_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('courier_profile_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30); // student_card, id_card, license, registration, insurance, vehicle_photo, profile_photo
            $table->string('path');
            $table->text('document_number')->nullable(); // chiffré
            $table->date('expires_on')->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamps();
            $table->unique(['courier_profile_id', 'type']);
        });

        Schema::create('merchant_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('business_name');
            $table->string('category', 40); // alimentaire, mode, electronique, sante, beaute, maison, autre
            $table->string('ifu')->nullable(); // identifiant fiscal unique
            $table->string('rccm')->nullable(); // registre du commerce
            $table->foreignId('zone_id')->constrained('zones');
            $table->string('address');
            $table->text('description')->nullable();
            $table->json('documents')->nullable(); // chemins des pièces jointes
            $table->string('status', 20)->default('pending'); // pending, approved, rejected
            $table->text('admin_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->string('code', 12)->unique();
            $table->foreignId('client_id')->constrained('users');
            $table->foreignId('courier_id')->nullable()->constrained('users');
            $table->foreignId('pickup_zone_id')->constrained('zones');
            $table->string('pickup_address');
            $table->string('pickup_contact_phone', 20)->nullable();
            $table->foreignId('dropoff_zone_id')->constrained('zones');
            $table->string('dropoff_address');
            $table->string('recipient_name')->nullable();
            $table->string('recipient_phone', 20);
            $table->string('parcel_type', 20); // document, food, clothes, other
            $table->text('notes')->nullable();
            $table->unsignedInteger('price');
            $table->unsignedInteger('commission');
            $table->unsignedInteger('total');
            $table->string('status', 20)->default('awaiting_payment')->index();
            $table->text('confirmation_code'); // chiffré, montré au client uniquement
            $table->unsignedInteger('cancellation_fee')->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 20)->default('feexpay');
            $table->string('reference')->nullable()->unique();
            $table->string('network', 10); // MTN, MOOV
            $table->string('phone', 20);
            $table->unsignedInteger('amount');
            $table->string('status', 20)->default('pending'); // pending, held, released, refunded, failed
            $table->json('raw')->nullable();
            $table->timestamps();
        });

        Schema::create('ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('users');
            $table->foreignId('courier_id')->constrained('users');
            $table->unsignedTinyInteger('score');
            $table->unsignedTinyInteger('punctuality')->nullable();
            $table->unsignedTinyInteger('care')->nullable();
            $table->unsignedTinyInteger('politeness')->nullable();
            $table->text('comment')->nullable();
            $table->timestamps();
        });

        Schema::create('device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token')->unique();
            $table->string('platform', 10)->default('android');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['device_tokens', 'ratings', 'payments', 'deliveries', 'merchant_applications', 'courier_documents', 'courier_profiles', 'tariffs', 'zones', 'otp_codes'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
