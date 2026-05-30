<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GuestContact;
use App\Models\Otp;
use App\Models\Transaction;
use App\Models\User;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private SmsService $sms) {}

    // ── Step 1: Send OTP ─────────────────────────────────────────────

    public function sendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|min:10|max:15',
        ]);

        $phone = $this->normalizePhone($request->phone);

        // Delete previous unused OTPs for this phone — one active OTP at a time
        Otp::where('phone', $phone)->whereNull('used_at')->delete();

        // Cryptographically secure 6-digit OTP
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Otp::create([
            'phone'      => $phone,
            'code'       => $code,
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->sms->send($phone, "Your BrolenaBrodena OTP is: {$code}. Valid for 10 minutes.");

        // TODO: Remove 'otp' from response once SMS provider is set up
        return response()->json([
            'message' => 'OTP sent successfully.',
            'otp'     => $code,
        ]);
    }

    // ── Step 2: Verify OTP → login or create account ─────────────────

    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'code'  => 'required|string|size:6',
            'name'  => 'nullable|string|max:255',
        ]);

        $phone = $this->normalizePhone($request->phone);

        $otp = Otp::where('phone', $phone)
                  ->where('code', $request->code)
                  ->whereNull('used_at')
                  ->latest()
                  ->first();

        if (!$otp) {
            return response()->json(['message' => 'Invalid OTP.'], 422);
        }

        if ($otp->isExpired()) {
            return response()->json(['message' => 'OTP expired. Request a new one.'], 422);
        }

        $isNewUser = false;
        $user      = User::where('phone', $phone)->first();

        if (! $user) {
            // New user — name required on first login
            if (! $request->name) {
                return response()->json([
                    'message'  => 'Please provide your name.',
                    'requires' => 'name',
                ], 422);
            }

            $user = User::create([
                'name'  => $request->name,
                'phone' => $phone,
            ]);

            // Auto-link any guest contacts waiting for this phone number
            $this->resolveGuestContacts($user);

            $isNewUser = true;
        }

        // Mark used — prevents replay attacks
        $otp->update(['used_at' => now()]);

        // Single active session per user
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'        => $user,
            'token'       => $token,
            'is_new_user' => $isNewUser,
        ]);
    }

    // ── Standard auth helpers ─────────────────────────────────────────

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    // ── Private helpers ───────────────────────────────────────────────

    /**
     * When a new user registers with a phone number, find any guest contacts
     * using that number, mark them as resolved, and convert their guest
     * transactions into real bilateral transactions that both parties can manage.
     */
    private function resolveGuestContacts(User $user): void
    {
        $guests = GuestContact::where('phone', $user->phone)
                              ->whereNull('resolved_user_id')
                              ->get();

        foreach ($guests as $guest) {
            $guest->update(['resolved_user_id' => $user->id]);

            // Convert guest transactions to real ones
            Transaction::where('payer_guest_id', $guest->id)
                ->orWhere('payee_guest_id', $guest->id)
                ->each(function (Transaction $tx) use ($user) {
                    $tx->payer_id       = $tx->payer_guest_id ? $user->id : $tx->payer_id;
                    $tx->payee_id       = $tx->payee_guest_id ? $user->id : $tx->payee_id;
                    $tx->payer_guest_id = null;
                    $tx->payee_guest_id = null;
                    $tx->status         = 'pending'; // new user must confirm
                    $tx->save();
                });

            // Notify the person who originally added this guest contact
            try {
                $guest->creator->notify(
                    new \App\Notifications\GuestJoinedNotification($guest, $user)
                );
            } catch (\Throwable) {
                // Notification failure must never block registration
            }
        }
    }

    /**
     * Normalise any phone format to E.164 (+91XXXXXXXXXX for India).
     */
    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[\s\-\(\)]/', '', $phone);

        if (strlen($phone) === 10 && ! str_starts_with($phone, '+')) {
            $phone = '+91' . $phone;
        }

        if (! str_starts_with($phone, '+')) {
            $phone = '+' . $phone;
        }

        return $phone;
    }
}