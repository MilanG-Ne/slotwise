<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate(['date' => ['required_without:mine', 'date_format:Y-m-d'], 'mine' => ['sometimes', 'in:1']]);
        $query = Booking::with(['resource', 'user'])->orderBy('starts_at');
        if ($request->boolean('mine')) {
            $query->where('user_id', $request->user()->id)->where('ends_at', '>=', now()->subDays(30));
        } else {
            $day = CarbonImmutable::parse($request->input('date'), config('slotwise.timezone'))->startOfDay();
            $query->whereNull('cancelled_at')->where('starts_at', '<', $day->addDay()->utc())->where('ends_at', '>', $day->utc());
        }

        return BookingResource::collection($query->limit(500)->get());
    }

    public function store(StoreBookingRequest $request, BookingService $service): JsonResponse
    {
        $booking = $service->reserve($request->user(), $request->integer('resource_id'), $request->validated('title'), $request->startsAt(), $request->integer('duration'));

        return (new BookingResource($booking->load(['resource', 'user'])))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Booking $booking): BookingResource
    {
        abort_unless($booking->user_id === $request->user()->id || $request->user()->is_admin, 403);
        $cancelled = DB::transaction(function () use ($booking): Booking {
            $locked = Booking::query()->lockForUpdate()->findOrFail($booking->id);
            if ($locked->cancelled_at === null) {
                abort_unless($locked->starts_at->isFuture(), 409, 'A booking that has started cannot be cancelled.');
                $locked->update(['cancelled_at' => now()]);
            }

            return $locked;
        });

        return new BookingResource($cancelled->load(['resource', 'user']));
    }
}
