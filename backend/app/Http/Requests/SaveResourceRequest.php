<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'kind' => ['required', Rule::in(['room', 'studio', 'equipment'])],
            'location' => ['required', 'string', 'max:80'],
            'capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'description' => ['required', 'string', 'max:300'],
            'active' => ['required', 'boolean'],
        ];
    }
}
