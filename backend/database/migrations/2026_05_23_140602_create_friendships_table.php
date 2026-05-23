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
        Schema::create('friendships', function (Blueprint $table) {
            $table->id();

            // who sent the request
            $table->foreignId('requester_id')
                ->constrained('users')
                ->cascadeOnDelete();
            // cascadeOnDelete() means: if the user is deleted,
            // delete their friendship rows too. No orphaned data.

            // who received the request
            $table->foreignId('receiver_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->enum('status', ['pending', 'accepted', 'blocked'])
                ->default('pending');

            $table->timestamps();

            // Prevent duplicate requests
            // Alice can't send Bob two friend requests
            $table->unique(['requester_id', 'receiver_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('friendships');
    }
};
