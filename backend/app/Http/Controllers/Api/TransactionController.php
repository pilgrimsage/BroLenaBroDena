<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LedgerBalance;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    // ── Add a new transaction ───────────────────────────────────────

    public function store(Request $request)
    {
        $request->validate([
            'friend_id' => 'required|integer|exists:users,id',
            'amount'    => 'required|numeric|min:0.01|max:9999999',
            'note'      => 'nullable|string|max:500',
            'type'      => 'required|in:i_paid,they_paid',
            // i_paid    = I paid for them (they owe me)
            // they_paid = They paid for me (I owe them)
        ]);

        $me     = $request->user();
        $friend = User::findOrFail($request->friend_id);

        // Only friends can create transactions with each other
        if (! $me->isFriendWith($friend->id)) {
            return response()->json([
                'message' => 'You can only add transactions with friends.'
            ], 403);
        }

        // Determine who is payer and who is payee
        // i_paid → I am the payer, friend is the payee (they owe me)
        // they_paid → Friend is the payer, I am the payee (I owe them)
        if ($request->type === 'i_paid') {
            $payerId = $me->id;
            $payeeId = $friend->id;
        } else {
            $payerId = $friend->id;
            $payeeId = $me->id;
        }

        $transaction = Transaction::create([
            'creator_id' => $me->id,
            'payer_id'   => $payerId,
            'payee_id'   => $payeeId,
            'amount'     => $request->amount,
            'note'       => $request->note,
            'status'     => 'pending',
            // Always pending — other party must confirm
        ]);

        $transaction->load('payer:id,name', 'payee:id,name', 'creator:id,name');

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
}