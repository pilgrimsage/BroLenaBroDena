<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FriendshipController;

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