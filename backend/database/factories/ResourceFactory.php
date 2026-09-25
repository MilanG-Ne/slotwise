<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ResourceFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => fake()->unique()->word(), 'kind' => 'room', 'location' => 'First floor', 'capacity' => 6, 'description' => 'A quiet space to work.', 'active' => true];
    }
}
