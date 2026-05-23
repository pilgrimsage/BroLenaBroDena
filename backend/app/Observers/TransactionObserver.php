<?php

namespace App\Observers;

use App\Models\LedgerBalance;
use App\Models\Transaction;

class TransactionObserver
{
    public function updated(Transaction $transaction): void
    {
        // wasChanged() tells us if a specific column changed in this update
        if (! $transaction->wasChanged('status')) {
            return; // status didn't change — nothing to do
        }

        $old = $transaction->getOriginal('status'); // what it was before
        $new = $transaction->status;                // what it is now

        // Transaction just got confirmed → add to balance
        if ($new === 'confirmed') {
            LedgerBalance::adjust(
                $transaction->payer_id,
                $transaction->payee_id,
                (float) $transaction->amount
            );
        }

        // Transaction moved AWAY from confirmed (disputed) → reverse
        if ($old === 'confirmed' && $new !== 'confirmed') {
            LedgerBalance::adjust(
                $transaction->payer_id,
                $transaction->payee_id,
                -(float) $transaction->amount // negative = reverse
            );
        }
    }
}