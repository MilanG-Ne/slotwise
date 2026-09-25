<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ResourceController;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function (): void {
    Route::get('/session', [AuthController::class, 'session']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::middleware(['auth', 'throttle:api'])->group(function (): void {
        Route::get('/resources', [ResourceController::class, 'index']);
        Route::post('/resources', [ResourceController::class, 'store']);
        Route::put('/resources/{resource}', [ResourceController::class, 'update']);
        Route::get('/bookings', [BookingController::class, 'index']);
        Route::post('/bookings', [BookingController::class, 'store'])->middleware('throttle:bookings');
        Route::delete('/bookings/{booking}', [BookingController::class, 'destroy']);
    });
});

Route::get('/{path?}', function () {
    return response()->file(public_path('build/index.html'));
})->where('path', '(?!api(?:/|$)).*')->name('app');
