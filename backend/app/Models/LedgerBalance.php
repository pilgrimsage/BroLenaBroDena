<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class LedgerBalance extends Model
{
    protected $fillable = ['user_a_id', 'user_b_id', 'balance'];

    protected $casts = ['balance' => 'decimal:2'];

    // ── Core methods ────────────────────────────────────────────────

    /**
     * Get balance from $myId's perspective against $friendId.
     * Returns: positive = they owe me, negative = I owe them
     */
    public static function between(int $myId, int $friendId): float
    {
        [$a, $b] = self::canonical($myId, $friendId);

        $row = self::where('user_a_id', $a)
                   ->where('user_b_id', $b)
                   ->first();

        if (! $row) return 0.0;

        // If I am user_a, return as-is
        // If I am user_b, flip the sign
        return $myId === $a
            ? (float) $row->balance
            : -(float) $row->balance;
    }

    /**
     * Adjust the balance when a transaction is confirmed or reversed.
     *
     * $payerId paid $payeeId an amount of $delta.
     * This means payee owes payer more.
     * From payer's perspective: balance goes up.
     */
    public static function adjust(int $payerId, int $payeeId, float $delta): void
    {
        [$a, $b] = self::canonical($payerId, $payeeId);

        // Delta from user_a's perspective
        // If payer is user_a → positive (they're owed more)
        // If payer is user_b → negative (user_a owes more)
        $signedDelta = $payerId === $a ? $delta : -$delta;

        self::updateOrCreate(
            ['user_a_id' => $a, 'user_b_id' => $b],
            ['balance'   => DB::raw("balance + {$signedDelta}")]
        );
        // updateOrCreate: if row exists → update, if not → create
        // DB::raw lets us write raw SQL expression inside Eloquent
        // This is atomic — no race conditions
    }

    /**
     * Always return IDs in canonical order (smaller first).
     * This ensures one row per pair regardless of who queries.
     */
    private static function canonical(int $x, int $y): array
    {
        return $x < $y ? [$x, $y] : [$y, $x];
    }
}