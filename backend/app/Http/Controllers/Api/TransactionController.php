<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GuestContact;
use App\Models\LedgerBalance;
use App\Models\Transaction;
use App\Models\User;
use App\Notifications\TransactionNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    // ── Add a new transaction ─────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'user_id'          => 'nullable|integer|exists:users,id',
            'guest_name'       => 'nullable|string|max:255',
            'guest_email'      => 'nullable|email',
            'guest_phone'      => 'nullable|string|max:20',
            'amount'           => 'required|numeric|min:0.01|max:9999999',
            'note'             => 'nullable|string|max:500',
            'type'             => 'required|in:i_paid,they_paid',
            'transaction_date' => 'nullable|date|before_or_equal:today',
        ]);

        $me = $request->user();

        // ── Determine the other party ──────────────────────────────────

        $otherUser    = null;
        $guestContact = null;

        if ($request->user_id) {
            $otherUser = User::findOrFail($request->user_id);

            if ($otherUser->id === $me->id) {
                return response()->json(['message' => 'Cannot add a transaction with yourself.'], 422);
            }

        } elseif ($request->guest_name) {
            // Find existing guest contact or create a new one
            $guestContact = $this->findOrCreateGuest($me->id, $request);

            // If the guest has since registered, treat them as a real user
            if ($guestContact->isResolved()) {
                $otherUser    = $guestContact->resolvedUser;
                $guestContact = null;
            }

        } else {
            return response()->json([
                'message' => 'Provide user_id or guest details (guest_name required).',
            ], 422);
        }

        // ── Build payer / payee ────────────────────────────────────────

        if ($otherUser) {
            // Both registered users — needs confirmation from other party
            [$payerId, $payeeId, $payerGuestId, $payeeGuestId] = $request->type === 'i_paid'
                ? [$me->id, $otherUser->id, null, null]
                : [$otherUser->id, $me->id, null, null];

            $status = 'pending';

        } else {
            // Guest transaction — auto-confirmed, only one party involved
            if ($request->type === 'i_paid') {
                [$payerId, $payeeId]           = [$me->id, null];
                [$payerGuestId, $payeeGuestId] = [null, $guestContact->id];
            } else {
                [$payerId, $payeeId]           = [null, $me->id];
                [$payerGuestId, $payeeGuestId] = [$guestContact->id, null];
            }

            $status = 'confirmed'; // auto-confirmed — no one else to confirm
        }

        $transaction = Transaction::create([
            'creator_id'       => $me->id,
            'payer_id'         => $payerId,
            'payee_id'         => $payeeId,
            'payer_guest_id'   => $payerGuestId,
            'payee_guest_id'   => $payeeGuestId,
            'amount'           => $request->amount,
            'note'             => $request->note,
            'status'           => $status,
            'transaction_date' => $request->transaction_date ?? now()->toDateString(),
        ]);

        // Notify the registered friend (not the creator)
        if ($otherUser) {
            $transaction->load('creator');
            $otherUser->notify(new TransactionNotification($transaction, 'added'));
        }

        $transaction->load('payer', 'payee', 'creator', 'payerGuest', 'payeeGuest');

        return response()->json($transaction, 201);
    }

    // ── Confirm or dispute a transaction ──────────────────────────────

    public function respond(Request $request, Transaction $transaction): JsonResponse
    {
        $request->validate([
            'action' => 'required|in:confirm,dispute',
        ]);

        $me = $request->user();

        $involved = $me->id === $transaction->payer_id
                 || $me->id === $transaction->payee_id;

        if (! $involved) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($me->id === $transaction->creator_id) {
            return response()->json(['message' => 'You cannot respond to your own transaction.'], 403);
        }

        if ($transaction->status !== 'pending') {
            return response()->json(['message' => 'This transaction has already been handled.'], 409);
        }

        $transaction->update([
            'status' => $request->action === 'confirm' ? 'confirmed' : 'disputed',
        ]);

        // Notify creator of the outcome
        $transaction->load('creator');
        $transaction->creator->notify(
            new TransactionNotification(
                $transaction,
                $request->action === 'confirm' ? 'confirmed' : 'disputed'
            )
        );

        $friendId = $me->id === $transaction->payer_id
            ? $transaction->payee_id
            : $transaction->payer_id;

        return response()->json([
            'message'     => 'Transaction ' . $request->action . 'ed.',
            'transaction' => $transaction->load('payer:id,name', 'payee:id,name'),
            'new_balance' => LedgerBalance::between($me->id, $friendId),
        ]);
    }

    // ── Transactions with a specific registered friend ────────────────

    public function withFriend(Request $request, User $friend): JsonResponse
    {
        $me = $request->user();

        if (! $me->isFriendWith($friend->id)) {
            return response()->json(['message' => 'Not friends.'], 403);
        }

        $transactions = Transaction::between($me->id, $friend->id)
            ->with('payer:id,name', 'payee:id,name', 'creator:id,name')
            ->latest('transaction_date')
            ->paginate(20);

        $transactions->through(function ($tx) use ($me) {
            $tx->direction     = $tx->payer_id === $me->id ? 'i_paid' : 'they_paid';
            $tx->created_by_me = $tx->creator_id === $me->id;
            return $tx;
        });

        return response()->json([
            'balance'      => LedgerBalance::between($me->id, $friend->id),
            'transactions' => $transactions,
        ]);
    }

    // ── Transactions with a specific guest contact ────────────────────

    public function withGuest(Request $request, GuestContact $guest): JsonResponse
    {
        $me = $request->user();

        if ($guest->creator_id !== $me->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $transactions = Transaction::where(function ($q) use ($guest) {
                $q->where('payer_guest_id', $guest->id)
                  ->orWhere('payee_guest_id', $guest->id);
            })
            ->with('creator:id,name')
            ->latest('transaction_date')
            ->get()
            ->map(function ($tx) use ($me) {
                // I paid = I am payer_id (real user) and guest is payee_guest_id
                $tx->direction = ($tx->payer_id === $me->id) ? 'i_paid' : 'they_paid';
                return $tx;
            });

        $theyOweMe = $transactions->where('direction', 'i_paid')->sum('amount');
        $iOweThem  = $transactions->where('direction', 'they_paid')->sum('amount');

        return response()->json([
            'guest'        => $guest,
            'balance'      => round($theyOweMe - $iOweThem, 2),
            'transactions' => $transactions->values(),
        ]);
    }

    // ── Balance summary across all friends ────────────────────────────

    public function balances(Request $request): JsonResponse
    {
        $me      = $request->user();
        $friends = $me->friends();

        $friendBalances = $friends->map(function ($friend) use ($me) {
            $balance = LedgerBalance::between($me->id, $friend->id);

            return [
                'friend'  => [
                    'id'    => $friend->id,
                    'name'  => $friend->name,
                    'phone' => $friend->phone,
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

    // ── Edit own pending transaction ──────────────────────────────────

    public function update(Request $request, Transaction $transaction): JsonResponse
    {
        $request->validate([
            'amount'           => 'sometimes|numeric|min:0.01',
            'note'             => 'sometimes|nullable|string|max:500',
            'transaction_date' => 'sometimes|date|before_or_equal:today',
        ]);

        if ($transaction->creator_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($transaction->status !== 'pending') {
            return response()->json(['message' => 'Cannot edit a confirmed transaction.'], 409);
        }

        $transaction->update($request->only(['amount', 'note', 'transaction_date']));

        return response()->json($transaction);
    }

    // ── Delete own pending transaction ────────────────────────────────

    public function destroy(Request $request, Transaction $transaction): JsonResponse
    {
        if ($transaction->creator_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($transaction->status === 'confirmed') {
            return response()->json(['message' => 'Cannot delete a confirmed transaction.'], 409);
        }

        $transaction->delete();

        return response()->json(['message' => 'Transaction deleted.']);
    }

    // ── Private helpers ───────────────────────────────────────────────

    /**
     * Find or create a guest contact, handling null email/phone correctly.
     * MySQL treats multiple NULLs as distinct in unique indexes,
     * so we must query conditionally instead of using firstOrCreate with nulls.
     */
    private function findOrCreateGuest(int $creatorId, Request $request): GuestContact
    {
        // Try to find by email first
        if ($request->guest_email) {
            $existing = GuestContact::where('creator_id', $creatorId)
                ->where('email', $request->guest_email)
                ->first();

            if ($existing) return $existing;
        }

        // Try to find by phone
        if ($request->guest_phone) {
            $normalized = $this->normalizePhone($request->guest_phone);
            $existing   = GuestContact::where('creator_id', $creatorId)
                ->where('phone', $normalized)
                ->first();

            if ($existing) return $existing;
        }

        // Create new guest contact
        return GuestContact::create([
            'creator_id' => $creatorId,
            'name'       => $request->guest_name,
            'email'      => $request->guest_email ?: null,
            'phone'      => $request->guest_phone
                ? $this->normalizePhone($request->guest_phone)
                : null,
        ]);
    }

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

    private function balanceSummary(float $balance, string $name): string
    {
        if ($balance > 0) return "{$name} owes you ₹{$balance}";
        if ($balance < 0) return "You owe {$name} ₹" . abs($balance);
        return "All settled with {$name}";
    }
}