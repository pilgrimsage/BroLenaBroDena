<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('guest_contacts', function (Blueprint $table) {
            $table->id();

            // Who added this guest
            $table->foreignId('creator_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();

            // Filled when guest registers — links guest to real user
            $table->foreignId('resolved_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            // One guest record per creator+email combo
            // Alice can't have two "bob@gmail.com" guests
            $table->unique(['creator_id', 'email']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guest_contacts');
    }
};
