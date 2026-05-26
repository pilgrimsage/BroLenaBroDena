<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Friendship;
use App\Models\User;
use Illuminate\Http\Request;

use App\Notifications\FriendRequestNotification;

class FriendshipController extends Controller
{
    // ── Send a friend request ───────────────────────────────────────

    public function send(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            // exists:users,email means the email must be in the users table
            // returns 422 automatically if user doesn't exist
        ]);

        $me       = $request->user();
        $receiver = User::where('email', $request->email)->first();

        // Can't add yourself
        if ($receiver->id === $me->id) {
            return response()->json([
                'message' => 'You cannot send a friend request to yourself.'
            ], 422);
        }

        // Check if a friendship already exists in any state
        $existing = $me->friendshipWith($receiver->id);

        if ($existing) {
            return response()->json([
                'message' => 'A friendship already exists.',
                'status'  => $existing->status,
            ], 409);
            // 409 = Conflict — resource already exists in some state
        }

        // Create the friendship in pending state
        $friendship = Friendship::create([
            'requester_id' => $me->id,
            'receiver_id'  => $receiver->id,
            'status'       => 'pending',
        ]);

        $friendship->load('requester');
        $receiver->notify(new FriendRequestNotification($friendship));

        // Load the receiver relationship so we can return their details
        $friendship->load('receiver:id,name,email');

        return response()->json($friendship, 201);
    }

    // ── Accept or decline a received request ────────────────────────

    public function respond(Request $request, Friendship $friendship)
    {
        // Route model binding — Laravel automatically finds
        // Friendship::find($id) from the URL. More on this below.

        $request->validate([
            'action' => 'required|in:accept,decline',
        ]);

        $me = $request->user();

        // Only the RECEIVER can accept or decline
        if ($friendship->receiver_id !== $me->id) {
            return response()->json([
                'message' => 'Only the receiver can respond to this request.'
            ], 403);
        }

        // Can only respond to pending requests
        if ($friendship->status !== 'pending') {
            return response()->json([
                'message' => 'This request has already been handled.'
            ], 409);
        }

        if ($request->action === 'accept') {
            $friendship->update(['status' => 'accepted']);

            return response()->json([
                'message'    => 'Friend request accepted.',
                'friendship' => $friendship->load('requester:id,name,email'),
            ]);
        }

        // Decline — just delete the record
        $friendship->delete();

        return response()->json([
            'message' => 'Friend request declined.'
        ]);
    }

    // ── List all accepted friends ────────────────────────────────────

    public function index(Request $request)
    {
        $friends = $request->user()->friends();

        return response()->json($friends);
    }

    // ── List pending requests I received ────────────────────────────

    public function pending(Request $request)
    {
        $pending = $request->user()
            ->receivedRequests()
            ->where('status', 'pending')
            ->with('requester:id,name,email')
            // with() = eager loading — loads the requester in same query
            // without this, Laravel runs a separate query per row (N+1 problem)
            ->get();

        return response()->json($pending);
    }

    // ── Remove a friend ─────────────────────────────────────────────

    public function remove(Request $request, User $user)
    {
        $friendship = $request->user()->friendshipWith($user->id);

        if (! $friendship) {
            return response()->json(['message' => 'No friendship found.'], 404);
        }

        $friendship->delete();

        return response()->json(['message' => 'Friend removed.']);
    }
}