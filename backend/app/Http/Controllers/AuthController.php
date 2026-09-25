<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function session(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $user ? ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'is_admin' => $user->is_admin] : null,
            'csrf_token' => csrf_token(),
            'timezone' => config('slotwise.timezone'),
            'today' => now(config('slotwise.timezone'))->toDateString(),
            'demo' => config('slotwise.demo'),
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email', 'max:254'], 'password' => ['required', 'string', 'max:128']]);
        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages(['email' => 'The email or password is incorrect.']);
        }
        $request->session()->regenerate();

        return $this->session($request);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->session($request);
    }
}
