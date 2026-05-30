<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Friendship;
use App\Models\User;
use App\Notifications\FriendRequestNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FriendshipController extends Controller
{
    // ── Send a friend request by phone number ─────────────────────────

    public function send(Request $request): JsonResponse
    {
        $request->validate([
            // Accept phone (primary) or email (fallback for older accounts)
            'phone' => 'required_without:email|nullable|string',
            'email' => 'required_without:phone|nullable|email',
        ]);

        $me = $request->user();

        // Find receiver — phone first, then email
        $receiver = null;

        if ($request->phone) {
            $normalized = $this->normalizePhone($request->phone);
            $receiver   = User::where('phone', $normalized)->first();
        }

        if (! $receiver && $request->email) {
            $receiver = User::where('email', $request->email)->first();
        }

        if (! $receiver) {
            return response()->json([
                'message' => 'No user found with that phone number or email.',
            ], 404);
        }

        if ($receiver->id === $me->id) {
            return response()->json([
                'message' => 'You cannot send a friend request to yourself.',
            ], 422);
        }

        $existing = $me->friendshipWith($receiver->id);

        if ($existing) {
            return response()->json([
                'message' => 'A friendship already exists.',
                'status'  => $existing->status,
            ], 409);
        }

        $friendship = Friendship::create([
            'requester_id' => $me->id,
            'receiver_id'  => $receiver->id,
            'status'       => 'pending',
        ]);

        $friendship->load('requester');
        $receiver->notify(new FriendRequestNotification($friendship));
        $friendship->load('receiver:id,name,phone');

        return response()->json($friendship, 201);
    }

    // ── Accept or decline a received request ──────────────────────────

    public function respond(Request $request, Friendship $friendship): JsonResponse
    {
        $request->validate([
            'action' => 'required|in:accept,decline',
        ]);

        $me = $request->user();

        if ($friendship->receiver_id !== $me->id) {
            return response()->json([
                'message' => 'Only the receiver can respond to this request.',
            ], 403);
        }

        if ($friendship->status !== 'pending') {
            return response()->json([
                'message' => 'This request has already been handled.',
            ], 409);
        }

        if ($request->action === 'accept') {
            $friendship->update(['status' => 'accepted']);

            return response()->json([
                'message'    => 'Friend request accepted.',
                'friendship' => $friendship->load('requester:id,name,phone'),
            ]);
        }

        $friendship->delete();

        return response()->json(['message' => 'Friend request declined.']);
    }

    // ── List all accepted friends ─────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->friends());
    }

    // ── Pending requests I received ───────────────────────────────────

    public function pending(Request $request): JsonResponse
    {
        $pending = $request->user()
            ->receivedRequests()
            ->where('status', 'pending')
            ->with('requester:id,name,phone')
            ->get();

        return response()->json($pending);
    }

    // ── Remove a friend ───────────────────────────────────────────────

    public function remove(Request $request, User $user): JsonResponse
    {
        $friendship = $request->user()->friendshipWith($user->id);

        if (! $friendship) {
            return response()->json(['message' => 'No friendship found.'], 404);
        }

        $friendship->delete();

        return response()->json(['message' => 'Friend removed.']);
    }

    // ── Private helpers ───────────────────────────────────────────────

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