<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FriendshipController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\SettlementController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\GuestContactController;

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes — no token needed
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
     // Public
    Route::post('send-otp',    [AuthController::class, 'sendOtp']);
    Route::post('verify-otp',  [AuthController::class, 'verifyOtp']);
});
Route::get('/transactions/with-guest/{guest}', [TransactionController::class, 'withGuest']);
/*
|--------------------------------------------------------------------------
| Protected routes — valid token required in Authorization header
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::get('me',      [AuthController::class, 'me']);
    Route::post('logout', [AuthController::class, 'logout']);
});

/*
|--------------------------------------------------------------------------
| Friend routes — all protected
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->prefix('friends')->group(function () {

    Route::get('/',                          [FriendshipController::class, 'index']);
    Route::get('/pending',                   [FriendshipController::class, 'pending']);
    Route::post('/send',                     [FriendshipController::class, 'send']);
    Route::post('/{friendship}/respond',     [FriendshipController::class, 'respond']);
    Route::delete('/{user}',                 [FriendshipController::class, 'remove']);

});



Route::middleware('auth:sanctum')->prefix('transactions')->group(function () {
    Route::get('/balances',               [TransactionController::class, 'balances']);
    Route::get('/with/{friend}',          [TransactionController::class, 'withFriend']);
    Route::post('/',                      [TransactionController::class, 'store']);
    Route::post('/{transaction}/respond', [TransactionController::class, 'respond']);
    Route::patch('/{transaction}',        [TransactionController::class, 'update']);
    Route::delete('/{transaction}',       [TransactionController::class, 'destroy']);
});


Route::middleware('auth:sanctum')->prefix('settlements')->group(function () {
    Route::get('/suggest',               [SettlementController::class, 'suggest']);
    Route::get('/with/{friend}',         [SettlementController::class, 'index']);
    Route::post('/',                     [SettlementController::class, 'store']);
    Route::post('/{settlement}/respond', [SettlementController::class, 'respond']);
    Route::delete('/{settlement}',       [SettlementController::class, 'cancel']);
});



Route::middleware('auth:sanctum')->prefix('notifications')->group(function () {
    Route::get('/',                  [NotificationController::class, 'index']);
    Route::get('/unread',            [NotificationController::class, 'unread']);
    Route::post('/mark-all-read',    [NotificationController::class, 'markAllRead']);
    Route::post('/fcm-token',        [NotificationController::class, 'updateFcmToken']);
    Route::post('/{id}/read',        [NotificationController::class, 'markRead']);
    Route::delete('/{id}',           [NotificationController::class, 'destroy']);
});



Route::middleware('auth:sanctum')->prefix('guests')->group(function () {
    Route::get('/',         [GuestContactController::class, 'index']);
    Route::post('/',        [GuestContactController::class, 'store']);
    Route::delete('/{guest}', [GuestContactController::class, 'destroy']);
});