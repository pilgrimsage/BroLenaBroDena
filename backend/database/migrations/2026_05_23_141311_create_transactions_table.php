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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();

            // Who created this entry (could be payer or payee)
            $table->foreignId('creator_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // Who paid / lent money
            $table->foreignId('payer_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // Who owes / received
            $table->foreignId('payee_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->decimal('amount', 10, 2);
            // decimal(10, 2) means up to 99999999.99
            // never use float for money — floating point errors

            $table->string('note')->nullable();

            $table->enum('status', ['pending', 'confirmed', 'disputed'])
                ->default('pending');

            $table->timestamps();

            // Speed up balance queries — we query by payer+payee+status often
            $table->index(['payer_id', 'payee_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
