<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 9, 25)->setTime(6, 0));
    }

    private function payload(Resource $resource, array $changes = []): array
    {
        return array_replace(['resource_id' => $resource->id, 'title' => 'Design review', 'date' => '2026-09-26', 'start_time' => '10:00', 'duration' => 60], $changes);
    }

    public function test_creates_a_booking_in_utc_and_ignores_forged_ownership(): void
    {
        $resource = Resource::factory()->create();
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $response = $this->actingAs($owner)->postJson('/api/bookings', $this->payload($resource, ['user_id' => $other->id, 'cancelled_at' => now()->toIso8601String()]));

        $response->assertCreated()->assertJsonPath('data.starts_at', '2026-09-26T08:00:00+00:00')->assertJsonPath('data.ends_at', '2026-09-26T09:00:00+00:00')->assertJsonPath('data.mine', true);
        $this->assertDatabaseHas('bookings', ['id' => $response->json('data.id'), 'user_id' => $owner->id, 'cancelled_at' => null]);
        $this->getJson('/api/bookings?date=2026-09-26')->assertOk()->assertJsonPath('data.0.starts_at', '2026-09-26T08:00:00+00:00')->assertJsonPath('data.0.ends_at', '2026-09-26T09:00:00+00:00');
    }

    public function test_returns_409_for_overlapping_booking_without_changing_existing_one(): void
    {
        $resource = Resource::factory()->create();
        $existing = Booking::factory()->for($resource)->create(['starts_at' => '2026-09-26 08:00:00+00', 'ends_at' => '2026-09-26 09:00:00+00']);

        $this->actingAs(User::factory()->create())->postJson('/api/bookings', $this->payload($resource, ['start_time' => '10:30']))->assertConflict()->assertJsonPath('message', 'That time was just taken. Choose another slot.');

        $this->assertDatabaseCount('bookings', 1);
        $this->assertModelExists($existing);
    }

    public function test_allows_adjacent_bookings_and_same_time_on_a_different_resource(): void
    {
        $resource = Resource::factory()->create();
        Booking::factory()->for($resource)->create(['starts_at' => '2026-09-26 08:00:00+00', 'ends_at' => '2026-09-26 09:00:00+00']);
        $this->actingAs(User::factory()->create());

        $this->postJson('/api/bookings', $this->payload($resource, ['start_time' => '11:00']))->assertCreated();
        $this->postJson('/api/bookings', $this->payload(Resource::factory()->create()))->assertCreated();

        $this->assertDatabaseCount('bookings', 3);
    }

    #[DataProvider('invalidBookings')]
    public function test_returns_422_for_invalid_booking_input(array $changes, string $field): void
    {
        $resource = Resource::factory()->create();

        $this->actingAs(User::factory()->create())->postJson('/api/bookings', $this->payload($resource, $changes))->assertUnprocessable()->assertJsonValidationErrors($field);

        $this->assertDatabaseCount('bookings', 0);
    }

    public static function invalidBookings(): array
    {
        return [
            'empty title' => [['title' => '   '], 'title'],
            'long title' => [['title' => str_repeat('a', 101)], 'title'],
            'invalid calendar date' => [['date' => '2026-02-30'], 'date'],
            'past time' => [['date' => '2026-09-24'], 'date'],
            'beyond horizon' => [['date' => '2027-01-01'], 'date'],
            'before opening' => [['start_time' => '07:30'], 'start_time'],
            'not on half hour' => [['start_time' => '10:15'], 'start_time'],
            'after closing' => [['start_time' => '19:30', 'duration' => 60], 'duration'],
            'short duration' => [['duration' => 15], 'duration'],
            'long duration' => [['duration' => 270], 'duration'],
            'wrong duration step' => [['duration' => 45], 'duration'],
            'nonexistent resource' => [['resource_id' => 999999], 'resource_id'],
        ];
    }

    public function test_returns_409_for_paused_resource(): void
    {
        $resource = Resource::factory()->create(['active' => false]);

        $this->actingAs(User::factory()->create())->postJson('/api/bookings', $this->payload($resource))->assertConflict();

        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_cancellation_releases_slot_and_is_idempotent(): void
    {
        $resource = Resource::factory()->create();
        $user = User::factory()->create();
        $booking = Booking::factory()->for($resource)->for($user)->create(['starts_at' => '2026-09-26 08:00:00+00', 'ends_at' => '2026-09-26 09:00:00+00']);
        $this->actingAs($user);

        $this->deleteJson('/api/bookings/'.$booking->id)->assertOk()->assertJsonPath('data.can_cancel', false);
        $this->deleteJson('/api/bookings/'.$booking->id)->assertOk();
        $this->postJson('/api/bookings', $this->payload($resource))->assertCreated();

        $this->assertNotNull($booking->fresh()->cancelled_at);
        $this->assertSame(1, Booking::whereNull('cancelled_at')->count());
    }

    public function test_returns_403_when_a_member_cancels_another_members_booking(): void
    {
        $booking = Booking::factory()->create();

        $this->actingAs(User::factory()->create())->deleteJson('/api/bookings/'.$booking->id)->assertForbidden();

        $this->assertNull($booking->fresh()->cancelled_at);
    }

    public function test_admin_can_cancel_another_members_booking(): void
    {
        $booking = Booking::factory()->create();

        $this->actingAs(User::factory()->create(['is_admin' => true]))->deleteJson('/api/bookings/'.$booking->id)->assertOk();

        $this->assertNotNull($booking->fresh()->cancelled_at);
    }

    public function test_returns_409_when_cancelling_a_started_booking(): void
    {
        $user = User::factory()->create();
        $booking = Booking::factory()->for($user)->create(['starts_at' => now()->subMinutes(30), 'ends_at' => now()->addMinutes(30)]);

        $this->actingAs($user)->deleteJson('/api/bookings/'.$booking->id)->assertConflict();

        $this->assertNull($booking->fresh()->cancelled_at);
    }

    public function test_members_see_availability_without_private_titles_or_other_peoples_history(): void
    {
        $private = Booking::factory()->create(['title' => 'Private interview']);
        $user = User::factory()->create();
        $own = Booking::factory()->for($user)->create();
        $this->actingAs($user);

        $this->getJson('/api/bookings?date=2026-09-26')->assertOk()->assertJsonCount(2, 'data')->assertJsonMissing(['title' => 'Private interview'])->assertJsonFragment(['title' => 'Reserved', 'owner' => null, 'can_cancel' => false]);
        $this->getJson('/api/bookings?mine=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $own->id);
    }

    public function test_handles_workspace_timezone_after_daylight_saving_change(): void
    {
        $resource = Resource::factory()->create();

        $this->actingAs(User::factory()->create())->postJson('/api/bookings', $this->payload($resource, ['date' => '2026-10-25', 'start_time' => '08:00']))->assertCreated()->assertJsonPath('data.starts_at', '2026-10-25T07:00:00+00:00');
    }

    public function test_requires_a_valid_day_filter(): void
    {
        $this->actingAs(User::factory()->create())->getJson('/api/bookings?date=not-a-date')->assertUnprocessable()->assertJsonValidationErrors('date');
    }
}
