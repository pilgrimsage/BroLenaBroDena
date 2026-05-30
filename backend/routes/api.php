<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FriendshipController;
use App\Http\Controllers\Api\GuestContactController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SettlementController;
use App\Http\Controllers\Api\TransactionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes — no token needed
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('send-otp',   [AuthController::class, 'sendOtp']);
    Route::post('verify-otp', [AuthController::class, 'verifyOtp']);
});

/*
|--------------------------------------------------------------------------
| Protected routes — valid Sanctum token required
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::get('me',      [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });

    // Friends
    Route::prefix('friends')->group(function () {
        Route::get('/',                       [FriendshipController::class, 'index']);
        Route::get('/pending',                [FriendshipController::class, 'pending']);
        Route::post('/send',                  [FriendshipController::class, 'send']);
        Route::post('/{friendship}/respond',  [FriendshipController::class, 'respond']);
        Route::delete('/{user}',              [FriendshipController::class, 'remove']);
    });

    // Transactions
    Route::prefix('transactions')->group(function () {
        Route::get('/balances',               [TransactionController::class, 'balances']);
        Route::get('/with/{friend}',          [TransactionController::class, 'withFriend']);
        Route::get('/with-guest/{guest}',     [TransactionController::class, 'withGuest']); // ← behind auth now
        Route::post('/',                      [TransactionController::class, 'store']);
        Route::post('/{transaction}/respond', [TransactionController::class, 'respond']);
        Route::patch('/{transaction}',        [TransactionController::class, 'update']);
        Route::delete('/{transaction}',       [TransactionController::class, 'destroy']);
    });

    // Settlements
    Route::prefix('settlements')->group(function () {
        Route::get('/suggest',               [SettlementController::class, 'suggest']);
        Route::get('/with/{friend}',         [SettlementController::class, 'index']);
        Route::post('/',                     [SettlementController::class, 'store']);
        Route::post('/{settlement}/respond', [SettlementController::class, 'respond']);
        Route::delete('/{settlement}',       [SettlementController::class, 'cancel']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/',                [NotificationController::class, 'index']);
        Route::get('/unread',          [NotificationController::class, 'unread']);
        Route::post('/mark-all-read',  [NotificationController::class, 'markAllRead']);
        Route::post('/fcm-token',      [NotificationController::class, 'updateFcmToken']);
        Route::post('/{id}/read',      [NotificationController::class, 'markRead']);
        Route::delete('/{id}',         [NotificationController::class, 'destroy']);
    });

    // Guest contacts
    Route::prefix('guests')->group(function () {
        Route::get('/',             [GuestContactController::class, 'index']);
        Route::post('/',            [GuestContactController::class, 'store']);
        Route::delete('/{guest}',   [GuestContactController::class, 'destroy']);
    });
});