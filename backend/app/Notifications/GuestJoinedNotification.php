<?php

namespace App\Notifications;

use App\Models\GuestContact;
use App\Models\User;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class GuestJoinedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public GuestContact $guest,
        public User $newUser
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['database', FcmChannel::class];
    }

    public function toArray(mixed $notifiable): array
    {
        return [
            'type'    => 'guest_joined',
            'message' => "{$this->newUser->name} joined FriendLedger! Your transactions with them are now pending confirmation.",
            'user'    => [
                'id'    => $this->newUser->id,
                'name'  => $this->newUser->name,
                'email' => $this->newUser->email,
            ],
        ];
    }

    public function toFcm(mixed $notifiable): array
    {
        return [
            'title' => "{$this->newUser->name} joined FriendLedger!",
            'body'  => "Your transactions with them are now pending confirmation.",
            'data'  => [
                'type'    => 'guest_joined',
                'user_id' => (string) $this->newUser->id,
            ],
        ];
    }
}