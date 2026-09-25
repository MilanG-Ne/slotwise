<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $mine = $request->user()->id === $this->user_id;
        $canView = $mine || $request->user()->is_admin;

        return [
            'id' => $this->id,
            'resource_id' => $this->resource_id,
            'resource_name' => $this->resource->name,
            'title' => $canView ? $this->title : 'Reserved',
            'owner' => $canView ? $this->user->name : null,
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->ends_at->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'mine' => $mine,
            'can_cancel' => $canView && $this->cancelled_at === null && $this->starts_at->isFuture(),
        ];
    }
}
