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
        Schema::create('ledger_balances', function (Blueprint $table) {
            $table->id();

            // Always lower ID first — canonical order
            $table->unsignedBigInteger('user_a_id');
            $table->unsignedBigInteger('user_b_id');

            // Positive = user_b owes user_a
            // Negative = user_a owes user_b
            $table->decimal('balance', 12, 2)->default(0);

            $table->timestamps();

            // One row per pair — enforced
            $table->unique(['user_a_id', 'user_b_id']);

            $table->foreign('user_a_id')
                ->references('id')->on('users')
                ->cascadeOnDelete();

            $table->foreign('user_b_id')
                ->references('id')->on('users')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ledger_balances');
    }
};
