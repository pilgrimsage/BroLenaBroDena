<?php

use Illuminate\Support\Facades\Route;

// Catch-all — serve React SPA for every non-API route
// React Router handles the actual navigation client-side
Route::get('/{any}', function () {
    return view('spa');
})->where('any', '.*');