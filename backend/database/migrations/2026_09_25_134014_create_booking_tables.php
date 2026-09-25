<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_admin')->default(false);
        });
        Schema::create('resources', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 80);
            $table->string('kind', 20);
            $table->string('location', 80);
            $table->unsignedSmallInteger('capacity');
            $table->string('description', 300);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
        Schema::create('bookings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('resource_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('title', 100);
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->timestampTz('cancelled_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'starts_at']);
        });
        DB::statement("ALTER TABLE bookings ADD CONSTRAINT booking_duration CHECK (ends_at > starts_at AND ends_at <= starts_at + interval '4 hours')");
        DB::statement("ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (resource_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (cancelled_at IS NULL)");
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('resources');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_admin'));
    }
};
