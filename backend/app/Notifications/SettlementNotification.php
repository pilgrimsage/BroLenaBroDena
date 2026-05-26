<?php

namespace App\Notifications;

use App\Models\Settlement;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class SettlementNotification extends Notification implements ShouldQueue
{
    use Queueable;

    // event: 'initiated' | 'confirmed' | 'cancelled'
    public function __construct(
        public Settlement $settlement,
        public string $event
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['database', FcmChannel::class];
    }

    public function toArray(mixed $notifiable): array
    {
        $from   = $this->settlement->fromUser;
        $amount = '₹' . number_format($this->settlement->amount, 2);

        $message = match ($this->event) {
            'initiated'  => "{$from->name} paid you {$amount} via {$this->settlement->method}. Confirm receipt.",
            'confirmed'  => "Your payment of {$amount} to {$this->settlement->toUser->name} was confirmed.",
            'cancelled'  => "Settlement of {$amount} was cancelled.",
            default      => "Settlement update.",
        };

        return [
            'type'          => 'settlement',
            'event'         => $this->event,
            'settlement_id' => $this->settlement->id,
            'amount'        => $this->settlement->amount,
            'method'        => $this->settlement->method,
            'message'       => $message,
        ];
    }

    public function toFcm(mixed $notifiable): array
    {
        $data = $this->toArray($notifiable);

        return [
            'title' => match ($this->event) {
                'initiated'  => 'Payment Received — Confirm?',
                'confirmed'  => 'Payment Confirmed ✓',
                'cancelled'  => 'Settlement Cancelled',
                default      => 'Settlement Update',
            },
            'body' => $data['message'],
            'data' => [
                'type'          => 'settlement',
                'event'         => $this->event,
                'settlement_id' => (string) $this->settlement->id,
            ],
        ];
    }
}