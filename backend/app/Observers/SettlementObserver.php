<?php

namespace App\Observers;

use App\Models\LedgerBalance;
use App\Models\Settlement;

class SettlementObserver
{
    public function updated(Settlement $settlement): void
    {
        if (! $settlement->wasChanged('status')) {
            return;
        }

        $old = $settlement->getOriginal('status');
        $new = $settlement->status;

        if ($new === 'confirmed') {
            // from_user paid to_user
            // This REDUCES what from_user owes to_user
            // from_user is the payee perspective — balance goes down
            // Equivalent: to_user gets paid back

            // Think of it as: to_user "paid" from_user (in reverse)
            // Which reduces to_user's positive balance
            LedgerBalance::adjust(
                $settlement->to_user_id,   // was owed money
                $settlement->from_user_id, // paid back
                -(float) $settlement->amount // negative = reduce balance
            );
        }

        // If confirmed settlement is cancelled — reverse it
        if ($old === 'confirmed' && $new === 'cancelled') {
            LedgerBalance::adjust(
                $settlement->to_user_id,
                $settlement->from_user_id,
                (float) $settlement->amount // positive = restore balance
            );
        }
    }
}