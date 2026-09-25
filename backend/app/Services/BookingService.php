<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Resource;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class BookingService
{
    public function reserve(User $user, int $resourceId, string $title, CarbonImmutable $start, int $duration): Booking
    {
        try {
            return DB::transaction(function () use ($user, $resourceId, $title, $start, $duration): Booking {
                // This row lock also serializes reservations with resource deactivation.
                $resource = Resource::query()->lockForUpdate()->findOrFail($resourceId);
                if (! $resource->active) {
                    throw new ConflictHttpException('This resource is paused. Please choose another.');
                }

                return Booking::create([
                    'user_id' => $user->id,
                    'resource_id' => $resource->id,
                    'title' => $title,
                    'starts_at' => $start->utc(),
                    'ends_at' => $start->addMinutes($duration)->utc(),
                ]);
            });
        } catch (QueryException $exception) {
            // PostgreSQL exclusion violations, including a concurrent winner, become a recoverable conflict.
            if ($exception->getCode() === '23P01') {
                throw new ConflictHttpException('That time was just taken. Choose another slot.', $exception);
            }
            throw $exception;
        }
    }
}
