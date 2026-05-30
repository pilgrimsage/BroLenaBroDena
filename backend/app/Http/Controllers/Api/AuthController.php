<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Otp;
use App\Models\User;
use App\Services\SmsService;
use App\Models\GuestContact;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{

    public function __construct(private SmsService $sms) {}

    // ── Step 1: Send OTP ─────────────────────────────────────────────

    public function sendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|min:10|max:15',
            // min:10 max:15 covers international formats
        ]);

        $phone = $this->normalizePhone($request->phone);

        // Delete previous unused OTPs for this phone
        Otp::where('phone', $phone)
           ->whereNull('used_at')
           ->delete();

        // Generate 6-digit OTP
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        // random_int is cryptographically secure — better than rand()

        // Store OTP — expires in 10 minutes
        Otp::create([
            'phone'      => $phone,
            'code'       => $code,
            'expires_at' => now()->addMinutes(10),
        ]);

        // Send SMS
        $sent = $this->sms->send($phone, "Your BrolenaBrodena OTP is: {$code}. Valid for 10 minutes.");

        if (!$sent && !app()->environment('local')) {
            return response()->json([
                'message' => 'Failed to send OTP. Try again.'
            ], 500);
        }

        $response = ['message' => 'OTP sent successfully.'];

        // In development — return OTP in response for easy testing
        // REMOVE THIS IN PRODUCTION
        
            $response['otp'] = $code;
            $response['note'] = 'OTP visible in dev mode only';
        

        return response()->json($response);
    }

    // ── Step 2: Verify OTP ───────────────────────────────────────────

    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'code'  => 'required|string|size:6',
            'name'  => 'nullable|string|max:255',
            // name only needed for new users
        ]);

        $phone = $this->normalizePhone($request->phone);

        // Find valid OTP
        $otp = Otp::where('phone', $phone)
                  ->where('code', $request->code)
                  ->whereNull('used_at')
                  ->latest()
                  ->first();

        if (!$otp) {
            return response()->json([
                'message' => 'Invalid OTP.'
            ], 422);
        }

        if ($otp->isExpired()) {
            return response()->json([
                'message' => 'OTP has expired. Request a new one.'
            ], 422);
        }

        // Mark OTP as used
        $otp->update(['used_at' => now()]);

        // Find or create user
        $isNewUser = false;
        $user = User::where('phone', $phone)->first();

        if (!$user) {
            // New user — name required
            if (!$request->name) {
                return response()->json([
                    'message'  => 'Please provide your name.',
                    'requires' => 'name',
                    // Frontend shows name input on this response
                ], 422);
            }

            $user = User::create([
                'name'  => $request->name,
                'phone' => $phone,
            ]);

            // Auto-resolve any guest contacts with this phone
            \App\Models\GuestContact::where('phone', $phone)
                ->whereNull('resolved_user_id')
                ->update(['resolved_user_id' => $user->id]);

            $isNewUser = true;
        }

        // Revoke old tokens
        $user->tokens()->delete();

        // Issue new token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'        => $user,
            'token'       => $token,
            'is_new_user' => $isNewUser,
        ]);
    }

    private function normalizePhone(string $phone): string
    {
        // Remove spaces, dashes, parentheses
        $phone = preg_replace('/[\s\-\(\)]/', '', $phone);

        // Add +91 for Indian numbers if no country code
        if (strlen($phone) === 10 && !str_starts_with($phone, '+')) {
            $phone = '+91' . $phone;
        }

        // Ensure + prefix
        if (!str_starts_with($phone, '+')) {
            $phone = '+' . $phone;
        }

        return $phone;
    }
    
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

        // Find any guest contacts matching this email or phone
        // Mark them as resolved — pointing to the new user
        GuestContact::where(function ($q) use ($user) {
            $q->where('email', $user->email);
        })->orWhere(function ($q) use ($user) {
            $q->when($user->phone, function ($q) use ($user) {
                $q->where('phone', $user->phone);
            });
        })->whereNull('resolved_user_id')
        ->update(['resolved_user_id' => $user->id]);

        // Now convert their guest transactions to real bilateral transactions
        // So both parties can see and manage them
        $resolvedGuests = GuestContact::where('resolved_user_id', $user->id)->get();

        foreach ($resolvedGuests as $guest) {
            // Find all transactions involving this guest
            $guestTransactions = Transaction::where('payer_guest_id', $guest->id)
                ->orWhere('payee_guest_id', $guest->id)
                ->get();

            foreach ($guestTransactions as $tx) {
                // Replace guest IDs with real user IDs
                $tx->payer_id       = $tx->payer_guest_id ? $user->id : $tx->payer_id;
                $tx->payee_id       = $tx->payee_guest_id ? $user->id : $tx->payee_id;
                $tx->payer_guest_id = null;
                $tx->payee_guest_id = null;

                // Reset to pending — new user must confirm
                // They shouldn't inherit auto-confirmed guest transactions blindly
                $tx->status = 'pending';
                $tx->save();
            }

            // Notify the creator that their guest joined
            $guest->creator->notify(
                new \App\Notifications\GuestJoinedNotification($guest, $user)
            );
        }

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