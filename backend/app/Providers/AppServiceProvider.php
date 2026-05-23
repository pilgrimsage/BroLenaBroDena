<?php

namespace App\Providers;

use App\Models\Transaction;
use App\Observers\TransactionObserver;
use Illuminate\Support\ServiceProvider;

use App\Models\Settlement;
use App\Observers\SettlementObserver;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Transaction::observe(TransactionObserver::class);
        // Now every time a Transaction is updated,
        // TransactionObserver::updated() runs automatically

        Settlement::observe(SettlementObserver::class);
    }
}