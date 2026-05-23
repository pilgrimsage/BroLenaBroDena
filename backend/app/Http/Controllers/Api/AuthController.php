<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        // Step 1: Validate
        // If anything fails, Laravel stops here and returns 422 JSON automatically
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'phone'    => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
        ]);

        // Step 2: Create user
        // Password is auto-hashed because of $casts in User model
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'phone'    => $request->phone,
            'password' => $request->password,
        ]);

        // Step 3: Create token
        // 'auth_token' is just a label — stored in personal_access_tokens.name
        $token = $user->createToken('auth_token')->plainTextToken;

        // Step 4: Return response
        return response()->json([
            'user'  => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        // Step 1: Validate — just check fields exist and are right type
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        // Step 2: Find user by email
        $user = User::where('email', $request->email)->first();

        // Step 3: Verify password
        // Hash::check compares plain text against hashed version in DB
        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
            // ValidationException automatically returns 422 JSON
        }

        // Step 4: Delete old tokens — one active session at a time
        // Without this, tokens accumulate in the database forever
        $user->tokens()->delete();

        // Step 5: Issue new token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => $user,
            'token' => $token,
        ]);
        // default status code is 200 — no need to specify
    }

    public function me(Request $request)
    {
        // $request->user() is the authenticated user
        // Sanctum middleware loaded them from the token
        // We just return them as JSON
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        // currentAccessToken() = the token used in THIS request
        // delete() removes it from personal_access_tokens table
        // Next request with same token will get 401
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.'
        ]);
    }
}