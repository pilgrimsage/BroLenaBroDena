<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LedgerBalance;
use App\Models\Transaction;
use App\Models\User;
use App\Models\GuestContact;

use Illuminate\Http\Request;

use App\Notifications\TransactionNotification;

class TransactionController extends Controller
{
    // ── Add a new transaction ───────────────────────────────────────

    public function store(Request $request)
    {
        $request->validate([
            // Option A — registered user (by email or id)
            'user_email'   => 'nullable|email|exists:users,email',
            'user_id'      => 'nullable|integer|exists:users,id',

            // Option B — guest (not on app)
            'guest_name'   => 'nullable|string|max:255',
            'guest_email'  => 'nullable|email',
            'guest_phone'  => 'nullable|string|max:20',

            'amount' => 'required|numeric|min:0.01|max:9999999',
            'note'   => 'nullable|string|max:500',
            'type'   => 'required|in:i_paid,they_paid',
            'transaction_date' => 'nullable|date|before_or_equal:today',
        ]);

        $me = $request->user();

        // ── Determine the other party ──────────────────────────────────

        $otherUser  = null; // User model if registered
        $guestContact = null; // GuestContact model if not registered

        if ($request->user_id || $request->user_email) {
            // Registered user — find them
            $otherUser = $request->user_id
                ? User::findOrFail($request->user_id)
                : User::where('email', $request->user_email)->firstOrFail();

            if ($otherUser->id === $me->id) {
                return response()->json([
                    'message' => 'Cannot add a transaction with yourself.'
                ], 422);
            }

        } elseif ($request->guest_name) {
            // Guest — find existing or create new
            $guestContact = GuestContact::firstOrCreate(
                [
                    'creator_id' => $me->id,
                    'email'      => $request->guest_email,
                ],
                [
                    'name'  => $request->guest_name,
                    'phone' => $request->guest_phone,
                ]
            );

            // firstOrCreate: if row with creator_id+email exists → return it
            // otherwise create a new one

            // Check if this guest already registered
            // If so, treat them as a registered user
            if ($guestContact->isResolved()) {
                $otherUser    = $guestContact->resolvedUser;
                $guestContact = null;
            }

        } else {
            return response()->json([
                'message' => 'Provide user_id, user_email, or guest details.'
            ], 422);
        }

        // ── Build the transaction ──────────────────────────────────────

        if ($otherUser) {
            // Both registered users
            [$payerId, $payeeId, $payerGuestId, $payeeGuestId] = $request->type === 'i_paid'
                ? [$me->id, $otherUser->id, null, null]
                : [$otherUser->id, $me->id, null, null];

            // Registered user transactions start as pending
            // They must confirm it
            $status = 'pending';

        } else {
            // One party is a guest
            if ($request->type === 'i_paid') {
                // I paid → guest owes me
                // payer = me (user), payee = guest
                [$payerId, $payeeId]           = [$me->id, null];
                [$payerGuestId, $payeeGuestId] = [null, $guestContact->id];
            } else {
                // They paid → I owe guest
                // payer = guest, payee = me (user)
                [$payerId, $payeeId]           = [null, $me->id];
                [$payerGuestId, $payeeGuestId] = [$guestContact->id, null];
            }

            // Guest transactions auto-confirm — no one to confirm them
            $status = 'confirmed';
        }

        $transaction = Transaction::create([
            'creator_id'     => $me->id,
            'payer_id'       => $payerId,
            'payee_id'       => $payeeId,
            'payer_guest_id' => $payerGuestId,
            'payee_guest_id' => $payeeGuestId,
            'amount'         => $request->amount,
            'note'           => $request->note,
            'status'         => $status,
            'transaction_date' => $request->transaction_date ?? now()->toDateString(),
        ]);

        // If auto-confirmed (guest) — Observer fires immediately
        // Balance updates right away

        // Notify registered user if they're involved
        if ($otherUser) {
            $transaction->load('creator');
            $otherUser->notify(new TransactionNotification($transaction, 'added'));
        }

        $transaction->load('payer', 'payee', 'creator', 'payerGuest', 'payeeGuest');

        return response()->json($transaction, 201);
    }

    // ── Confirm or dispute a transaction ────────────────────────────

    public function respond(Request $request, Transaction $transaction)
    {
        $request->validate([
            'action' => 'required|in:confirm,dispute',
        ]);

        $me = $request->user();

        // Must be involved in this transaction
        $involved = $me->id === $transaction->payer_id
                 || $me->id === $transaction->payee_id;

        if (! $involved) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Only the NON-creator can confirm/dispute
        // Creator already "confirmed" it by creating it
        if ($me->id === $transaction->creator_id) {
            return response()->json([
                'message' => 'You cannot respond to your own transaction.'
            ], 403);
        }

        if ($transaction->status !== 'pending') {
            return response()->json([
                'message' => 'This transaction has already been handled.'
            ], 409);
        }

        // Update status — Observer fires automatically after this
        $transaction->update(['status' => $request->action === 'confirm'
            ? 'confirmed'
            : 'disputed'
        ]);

        // Notify the creator that their transaction was confirmed/disputed
        $transaction->load('creator');
        $transaction->creator->notify(
            new TransactionNotification($transaction, $request->action === 'confirm' ? 'confirmed' : 'disputed')
        );

        // Observer::updated() runs here in the background
        // If confirmed → LedgerBalance::adjust() is called
        // Balance is now updated in ledger_balances table

        return response()->json([
            'message'     => 'Transaction ' . $request->action . 'ed.',
            'transaction' => $transaction->load('payer:id,name', 'payee:id,name'),
            'new_balance' => LedgerBalance::between($me->id,
                $me->id === $transaction->payer_id
                    ? $transaction->payee_id
                    : $transaction->payer_id
            ),
        ]);
    }

    // ── List transactions with a specific friend ─────────────────────

    public function withFriend(Request $request, User $friend)
    {
        $me = $request->user();

        if (! $me->isFriendWith($friend->id)) {
            return response()->json(['message' => 'Not friends.'], 403);
        }

        $transactions = Transaction::between($me->id, $friend->id)
            ->with('payer:id,name', 'payee:id,name', 'creator:id,name')
            ->latest() // order by created_at DESC
            ->paginate(20);

        // Add a field telling the client which direction
        // this transaction is from MY perspective
        $transactions->through(function ($tx) use ($me) {
            $tx->direction   = $tx->payer_id === $me->id ? 'i_paid' : 'they_paid';
            $tx->created_by_me = $tx->creator_id === $me->id;
            return $tx;
        });

        return response()->json([
            'balance'      => LedgerBalance::between($me->id, $friend->id),
            'transactions' => $transactions,
        ]);
    }

    // ── Overall balance summary across all friends ───────────────────

    public function balances(Request $request)
    {
        $me      = $request->user();
        $friends = $me->friends();

        $friendBalances = $friends->map(function ($friend) use ($me) {
            $balance = LedgerBalance::between($me->id, $friend->id);

            return [
                'friend'  => [
                    'id'    => $friend->id,
                    'name'  => $friend->name,
                    'email' => $friend->email,
                ],
                'balance' => $balance,
                'summary' => $this->balanceSummary($balance, $friend->name),
            ];
        });

        $totalOwedToMe = $friendBalances->where('balance', '>', 0)->sum('balance');
        $totalIOwe     = $friendBalances->where('balance', '<', 0)->sum('balance');

        return response()->json([
            'total_owed_to_me' => round($totalOwedToMe, 2),
            'total_i_owe'      => round(abs($totalIOwe), 2),
            'net'              => round($totalOwedToMe + $totalIOwe, 2),
            'friends'          => $friendBalances->values(),
        ]);
    }

    // ── Edit own pending transaction ─────────────────────────────────

    public function update(Request $request, Transaction $transaction)
    {
        $request->validate([
            'amount' => 'sometimes|numeric|min:0.01',
            'note'   => 'sometimes|nullable|string|max:500',
        ]);

        // Only creator can edit
        if ($transaction->creator_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Can only edit pending transactions
        if ($transaction->status !== 'pending') {
            return response()->json([
                'message' => 'Cannot edit a confirmed transaction.'
            ], 409);
        }

        $transaction->update($request->only(['amount', 'note']));

        return response()->json($transaction);
    }

    // ── Delete own pending transaction ───────────────────────────────

    public function destroy(Request $request, Transaction $transaction)
    {
        if ($transaction->creator_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($transaction->status === 'confirmed') {
            return response()->json([
                'message' => 'Cannot delete a confirmed transaction.'
            ], 409);
        }

        $transaction->delete();

        return response()->json(['message' => 'Transaction deleted.']);
    }

    // ── Private helper ───────────────────────────────────────────────

    private function balanceSummary(float $balance, string $friendName): string
    {
        if ($balance > 0) return "{$friendName} owes you ₹{$balance}";
        if ($balance < 0) return "You owe {$friendName} ₹" . abs($balance);
        return "All settled with {$friendName}";
    }

    // Transactions with a specific guest contact
public function withGuest(Request $request, GuestContact $guest): JsonResponse
{
    $me = $request->user();

    // Must be the creator of this guest contact
    if ($guest->creator_id !== $me->id) {
        return response()->json(['message' => 'Forbidden.'], 403);
    }

    $transactions = Transaction::where(function ($q) use ($guest) {
        $q->where('payer_guest_id', $guest->id)
          ->orWhere('payee_guest_id', $guest->id);
    })
    ->with('creator:id,name')
    ->latest()
    ->get()
    ->map(function ($tx) use ($me) {
        $tx->direction = $tx->payer_id === $me->id || $tx->payer_guest_id === null
            ? 'i_paid'
            : 'they_paid';
        return $tx;
    });

    // Balance for guest — sum of transactions
    $theyOweMe = $transactions
        ->where('direction', 'i_paid')
        ->sum('amount');

    $iOweThem = $transactions
        ->where('direction', 'they_paid')
        ->sum('amount');

    return response()->json([
        'guest'        => $guest,
        'balance'      => round($theyOweMe - $iOweThem, 2),
        'transactions' => $transactions,
    ]);
}
}