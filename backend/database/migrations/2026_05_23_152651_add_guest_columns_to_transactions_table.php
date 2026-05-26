<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Either payer_id OR payer_guest_id is filled — never both
            $table->foreignId('payer_guest_id')
                ->nullable()
                ->constrained('guest_contacts')
                ->nullOnDelete()
                ->after('payer_id');

            // Either payee_id OR payee_guest_id is filled — never both
            $table->foreignId('payee_guest_id')
                ->nullable()
                ->constrained('guest_contacts')
                ->nullOnDelete()
                ->after('payee_id');

            // Make payer_id and payee_id nullable
            // Because one of them might be a guest instead
            $table->foreignId('payer_id')->nullable()->change();
            $table->foreignId('payee_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['payer_guest_id']);
            $table->dropForeign(['payee_guest_id']);
            $table->dropColumn(['payer_guest_id', 'payee_guest_id']);

            $table->foreignId('payer_id')->nullable(false)->change();
            $table->foreignId('payee_id')->nullable(false)->change();
        });
    }
};
