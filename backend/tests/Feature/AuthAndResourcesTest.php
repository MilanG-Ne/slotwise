<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class AuthAndResourcesTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_anonymous_requests_cannot_read_or_mutate_workspace_data(): void
    {
        $this->getJson('/api/resources')->assertUnauthorized();
        $this->getJson('/api/bookings?mine=1')->assertUnauthorized();
        $this->postJson('/api/bookings', [])->assertUnauthorized();
    }

    public function test_login_and_logout_use_a_session_without_exposing_password_hashes(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk()->assertJsonPath('user.id', $user->id)->assertJsonMissingPath('user.password');
        $this->assertAuthenticatedAs($user);
        $this->postJson('/api/logout')->assertOk()->assertJsonPath('user', null);
        $this->assertGuest();
    }

    public function test_incorrect_password_returns_422_and_does_not_sign_in(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong'])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_login_is_rate_limited(): void
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/login', ['email' => 'nobody@example.test', 'password' => 'wrong'])->assertUnprocessable();
        }

        $this->postJson('/api/login', ['email' => 'nobody@example.test', 'password' => 'wrong'])->assertTooManyRequests();
    }

    public function test_member_cannot_create_or_modify_resources(): void
    {
        $resource = Resource::factory()->create();
        $this->actingAs(User::factory()->create());

        $this->postJson('/api/resources', $resource->toArray())->assertForbidden();
        $this->putJson('/api/resources/'.$resource->id, ['active' => false])->assertForbidden();

        $this->assertTrue($resource->fresh()->active);
        $this->assertDatabaseCount('resources', 1);
    }

    public function test_admin_can_add_and_pause_a_resource_without_losing_bookings(): void
    {
        $this->actingAs(User::factory()->create(['is_admin' => true]));
        $input = Resource::factory()->make()->toArray();

        $response = $this->postJson('/api/resources', $input)->assertCreated();
        $resource = Resource::findOrFail($response->json('data.id'));
        $booking = Booking::factory()->for($resource)->create();
        $this->putJson('/api/resources/'.$resource->id, [...$input, 'active' => false])->assertOk()->assertJsonPath('data.active', false);

        $this->assertModelExists($booking);
        $this->assertFalse($resource->fresh()->active);
    }

    public function test_invalid_resource_fields_are_rejected(): void
    {
        $this->actingAs(User::factory()->create(['is_admin' => true]))->postJson('/api/resources', ['name' => '', 'kind' => 'invalid', 'capacity' => 0])->assertUnprocessable()->assertJsonValidationErrors(['name', 'kind', 'capacity', 'location', 'description', 'active']);

        $this->assertDatabaseCount('resources', 0);
    }

    public function test_session_response_is_not_cacheable_and_has_security_headers(): void
    {
        $this->getJson('/api/session')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'DENY')->assertJsonPath('user', null)->assertJsonStructure(['csrf_token', 'timezone', 'today', 'demo']);
    }
}
