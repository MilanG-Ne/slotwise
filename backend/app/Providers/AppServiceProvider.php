<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()->id));
        RateLimiter::for('bookings', fn (Request $request) => Limit::perMinute(12)->by($request->user()->id));
    }
}
