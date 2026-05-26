<?php

namespace App\Notifications;

use App\Models\Transaction;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class TransactionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    // event: 'added' | 'confirmed' | 'disputed'
    public function __construct(
        public Transaction $transaction,
        public string $event
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['database', FcmChannel::class];
    }

    public function toArray(mixed $notifiable): array
    {
        $actor  = $this->transaction->creator;
        $amount = '₹' . number_format($this->transaction->amount, 2);

        $message = match ($this->event) {
            'added'     => "{$actor->name} added a transaction of {$amount}. Confirm or dispute.",
            'confirmed' => "{$actor->name} confirmed the transaction of {$amount}.",
            'disputed'  => "{$actor->name} disputed the transaction of {$amount}.",
            default     => "Transaction update from {$actor->name}.",
        };
        // match() is PHP 8 — like switch but cleaner, returns a value

        return [
            'type'           => 'transaction',
            'event'          => $this->event,
            'transaction_id' => $this->transaction->id,
            'amount'         => $this->transaction->amount,
            'message'        => $message,
            'actor'          => ['id' => $actor->id, 'name' => $actor->name],
        ];
    }

    public function toFcm(mixed $notifiable): array
    {
        $data = $this->toArray($notifiable);

        $title = match ($this->event) {
            'added'     => 'New Transaction — Action Required',
            'confirmed' => 'Transaction Confirmed ✓',
            'disputed'  => 'Transaction Disputed',
            default     => 'Transaction Update',
        };

        return [
            'title' => $title,
            'body'  => $data['message'],
            'data'  => [
                'type'           => 'transaction',
                'event'          => $this->event,
                'transaction_id' => (string) $this->transaction->id,
            ],
        ];
    }
}