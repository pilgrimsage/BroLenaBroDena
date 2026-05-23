<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FriendshipController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\SettlementController;

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes — no token needed
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

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