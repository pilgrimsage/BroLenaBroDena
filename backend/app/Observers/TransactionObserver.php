<?php

namespace App\Observers;

use App\Models\LedgerBalance;
use App\Models\Transaction;

class TransactionObserver
{
    public function updated(Transaction $transaction): void
    {
        if (! $transaction->wasChanged('status')) {
            return;
        }

        // Guard — guest transactions have null user IDs.
        // Balance adjustment only makes sense between two real users.
        if (is_null($transaction->payer_id) || is_null($transaction->payee_id)) {
            return;
        }

        $old = $transaction->getOriginal('status');
        $new = $transaction->status;

        // Transaction confirmed → increase balance (payer is owed more)
        if ($new === 'confirmed') {
            LedgerBalance::adjust(
                $transaction->payer_id,
                $transaction->payee_id,
                (float) $transaction->amount
            );
        }

        // Transaction moved away from confirmed → reverse the adjustment
        if ($old === 'confirmed' && $new !== 'confirmed') {
            LedgerBalance::adjust(
                $transaction->payer_id,
                $transaction->payee_id,
                -(float) $transaction->amount
            );
        }
    }
}