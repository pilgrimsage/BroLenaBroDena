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
        Schema::create('settlements', function (Blueprint $table) {
            $table->id();

            // who is paying back
            $table->foreignId('from_user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // who is receiving the money
            $table->foreignId('to_user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->decimal('amount', 10, 2);

            $table->enum('method', ['cash', 'upi', 'bank_transfer', 'other'])
                ->default('cash');

            // Optional UPI reference number / transaction ID
            $table->string('reference')->nullable();

            $table->string('note')->nullable();

            $table->enum('status', ['pending', 'confirmed', 'cancelled'])
                ->default('pending');

            $table->timestamp('settled_at')->nullable();

            $table->timestamps();

            $table->index(['from_user_id', 'to_user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settlements');
    }
};
