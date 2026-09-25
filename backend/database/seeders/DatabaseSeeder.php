<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Resource;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! config('slotwise.demo')) {
            throw new \RuntimeException('Demo seeding requires DEMO_MODE=true.');
        }
        $member = User::firstOrCreate(['email' => 'alex@example.test'], ['name' => 'Alex Morgan', 'password' => Hash::make('demo-password')]);
        $admin = User::firstOrCreate(['email' => 'jordan@example.test'], ['name' => 'Jordan Lee', 'password' => Hash::make('demo-password'), 'is_admin' => true]);
        $spaces = [
            ['The Glasshouse', 'room', 'Ground floor · East wing', 8, 'Big ideas, natural light. A bright meeting room with a whiteboard and video call setup.'],
            ['The Nook', 'room', 'First floor · Quiet zone', 3, 'A little room for focused conversations, interviews, and your next breakthrough.'],
            ['Studio 03', 'studio', 'Ground floor · Creative wing', 4, 'Sound-treated walls, a clean backdrop, and space to make something great.'],
            ['Focus Pod', 'room', 'First floor · Quiet zone', 1, 'Close the door, find your flow. A private spot for deep work or a long call.'],
            ['Creator Kit', 'equipment', 'Reception · Equipment shelf', 1, 'Camera, tripod, and a portable light. Everything you need for a small shoot.'],
        ];
        foreach ($spaces as $index => [$name, $kind, $location, $capacity, $description]) {
            $resource = Resource::firstOrCreate(['name' => $name], compact('kind', 'location', 'capacity', 'description'));
            for ($day = 0; $day < 5; $day++) {
                $date = CarbonImmutable::now(config('slotwise.timezone'))->startOfDay()->addDays($day);
                foreach ([9 + ($index % 3), 14 + ($index % 2)] as $slot => $hour) {
                    $start = $date->setTime($hour, $slot * 30)->utc();
                    $owner = ($index + $slot) % 3 === 0 ? $member : $admin;
                    Booking::firstOrCreate(['resource_id' => $resource->id, 'starts_at' => $start], [
                        'user_id' => $owner->id,
                        'title' => ['Weekly planning', 'Product workshop', 'Recording session', 'Focus time', 'Content shoot'][$index],
                        'ends_at' => $start->addMinutes($slot === 0 ? 90 : 60),
                    ]);
                }
            }
        }
    }
}
