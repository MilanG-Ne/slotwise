<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('demo:seed', function (): void {
    if (config('slotwise.demo') && ! DB::table('users')->exists()) {
        $this->call('db:seed', ['--force' => true]);
    }
})->purpose('Seed fictional demo data only when explicitly enabled and the database is empty');
