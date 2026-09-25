<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveResourceRequest;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ResourceController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Resource::orderBy('id')->get()]);
    }

    public function store(SaveResourceRequest $request): JsonResponse
    {
        return response()->json(['data' => Resource::create($request->validated())], 201);
    }

    public function update(SaveResourceRequest $request, Resource $resource): JsonResponse
    {
        $saved = DB::transaction(function () use ($request, $resource): Resource {
            $locked = Resource::query()->lockForUpdate()->findOrFail($resource->id);
            $locked->update($request->validated());

            return $locked;
        });

        return response()->json(['data' => $saved]);
    }
}
