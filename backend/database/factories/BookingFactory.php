<?php

namespace Database\Factories;

use App\Models\Resource;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingFactory extends Factory
{
    public function definition(): array
    {
        $start = now()->addDay()->setTime(10, 0);

        return ['resource_id' => Resource::factory(), 'user_id' => User::factory(), 'title' => 'Design review', 'starts_at' => $start, 'ends_at' => $start->copy()->addHour()];
    }
}
