<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SettlementResource;
use App\Models\LedgerBalance;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Http\Request;

use App\Notifications\SettlementNotification;

class SettlementController extends Controller
{
    // ── Initiate a settlement ────────────────────────────────────────

    public function store(Request $request)
    {
        $request->validate([
            'friend_id' => 'required|integer|exists:users,id',
            'amount'    => 'required|numeric|min:0.01',
            'method'    => 'required|in:cash,upi,bank_transfer,other',
            'reference' => 'nullable|string|max:255',
            'note'      => 'nullable|string|max:500',
        ]);

        $me     = $request->user();
        $friend = User::findOrFail($request->friend_id);

        if (! $me->isFriendWith($friend->id)) {
            return response()->json(['message' => 'Not friends.'], 403);
        }

        // Get current balance from MY perspective
        $balance = LedgerBalance::between($me->id, $friend->id);

        // Negative balance = I owe them = I should be paying
        // Positive balance = they owe me = they should be paying
        if ($balance >= 0) {
            return response()->json([
                'message' => 'You do not owe this friend anything. Ask them to settle instead.',
                'balance' => $balance,
            ], 422);
        }

        $iOwe = abs($balance);

        // Can't pay more than you owe
        if ($request->amount > $iOwe) {
            return response()->json([
                'message'        => 'Amount exceeds what you owe.',
                'maximum'        => $iOwe,
            ], 422);
        }

        $settlement = Settlement::create([
            'from_user_id' => $me->id,     // I am paying
            'to_user_id'   => $friend->id, // They receive
            'amount'       => $request->amount,
            'method'       => $request->method,
            'reference'    => $request->reference,
            'note'         => $request->note,
            'status'       => 'pending',
        ]);

        

        $settlement->load('fromUser', 'toUser');

        $friend->notify(new SettlementNotification($settlement, 'initiated'));

        return response()->json(
            new SettlementResource($settlement),
            201
        );
    }

    // ── Receiver confirms or cancels ─────────────────────────────────

    public function respond(Request $request, Settlement $settlement)
    {
        $request->validate([
            'action' => 'required|in:confirm,cancel',
        ]);

        $me = $request->user();

        // Only the receiver (to_user) can confirm receipt
        if ($settlement->to_user_id !== $me->id) {
            return response()->json([
                'message' => 'Only the receiver can confirm this settlement.'
            ], 403);
        }

        if ($settlement->status !== 'pending') {
            return response()->json([
                'message' => 'This settlement has already been handled.'
            ], 409);
        }

        if ($request->action === 'confirm') {
            $settlement->update([
                'status'     => 'confirmed',
                'settled_at' => now(),
                // now() is a Laravel helper — returns current timestamp
            ]);
        } else {
            $settlement->update(['status' => 'cancelled']);
        }

        // Observer fired above — balance already updated

        $settlement->load('fromUser', 'toUser');
        $settlement->fromUser->notify(
            new SettlementNotification(
                $settlement,
                $request->action === 'confirm' ? 'confirmed' : 'cancelled'
            )
        );

        // Return new balance so frontend can update immediately
        $newBalance = LedgerBalance::between($me->id, $settlement->from_user_id);

        return response()->json([
            'settlement'  => new SettlementResource($settlement),
            'new_balance' => $newBalance,
        ]);
    }

    // ── Payer cancels their own pending settlement ───────────────────

    public function cancel(Request $request, Settlement $settlement)
    {
        if ($settlement->from_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($settlement->status !== 'pending') {
            return response()->json([
                'message' => 'Cannot cancel — already handled.'
            ], 409);
        }

        $settlement->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Settlement cancelled.']);
    }

    // ── Settlement history with a friend ─────────────────────────────

    public function index(Request $request, User $friend)
    {
        $me = $request->user();

        if (! $me->isFriendWith($friend->id)) {
            return response()->json(['message' => 'Not friends.'], 403);
        }

        $settlements = Settlement::between($me->id, $friend->id)
            ->with('fromUser', 'toUser')
            ->latest()
            ->paginate(20);

        // SettlementResource::collection wraps each item in the resource
        return SettlementResource::collection($settlements);
    }

    // ── What should I pay to whom ─────────────────────────────────────

    public function suggest(Request $request)
    {
        $me      = $request->user();
        $friends = $me->friends();

        $suggestions = $friends
            ->map(function ($friend) use ($me) {
                $balance = LedgerBalance::between($me->id, $friend->id);

                // Only suggest if I owe them (negative balance)
                if ($balance >= 0) return null;

                return [
                    'friend'   => ['id' => $friend->id, 'name' => $friend->name],
                    'you_owe'  => abs($balance),
                    'action'   => "Pay {$friend->name} ₹" . abs($balance),
                ];
            })
            ->filter()  // remove nulls (friends where balance >= 0)
            ->values(); // reindex the array after filtering

        return response()->json([
            'suggestions' => $suggestions,
            'count'       => $suggestions->count(),
        ]);
    }
}