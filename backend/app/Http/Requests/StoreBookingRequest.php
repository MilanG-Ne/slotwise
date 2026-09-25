<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'resource_id' => ['required', 'integer', 'exists:resources,id'],
            'title' => ['required', 'string', 'max:100'],
            'date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i', 'regex:/^(0[8-9]|1[0-9]):(00|30)$/'],
            'duration' => ['required', 'integer', 'min:30', 'max:240', 'multiple_of:30'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $start = $this->startsAt();
            $now = CarbonImmutable::now(config('slotwise.timezone'));
            if ($start->lessThanOrEqualTo($now) || $start->toDateString() > $now->addDays(90)->toDateString()) {
                $validator->errors()->add('date', 'Choose a future time within the next 90 days.');
            }
            if ($start->addMinutes($this->integer('duration'))->greaterThan($start->setTime(20, 0))) {
                $validator->errors()->add('duration', 'Bookings must finish by 20:00.');
            }
        }];
    }

    public function startsAt(): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!Y-m-d H:i', $this->input('date').' '.$this->input('start_time'), config('slotwise.timezone'));
    }
}
