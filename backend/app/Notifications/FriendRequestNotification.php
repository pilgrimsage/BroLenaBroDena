<?php

namespace App\Notifications;

use App\Models\Friendship;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class FriendRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;
    // Queueable trait adds queue configuration options
    // ShouldQueue interface tells Laravel to queue this notification

    public function __construct(public Friendship $friendship)
    {
        // public property = automatically assigned
        // PHP 8 constructor promotion shorthand
    }

    // Which channels to use
    public function via(mixed $notifiable): array
    {
        return ['database', FcmChannel::class];
    }

    // What to store in the notifications table
    public function toArray(mixed $notifiable): array
    {
        return [
            'type'          => 'friend_request',
            'friendship_id' => $this->friendship->id,
            'from' => [
                'id'    => $this->friendship->requester->id,
                'name'  => $this->friendship->requester->name,
                'email' => $this->friendship->requester->email,
            ],
            'message' => "{$this->friendship->requester->name} sent you a friend request.",
        ];
    }

    // What to send as push notification
    public function toFcm(mixed $notifiable): array
    {
        return [
            'title' => 'New Friend Request',
            'body'  => "{$this->friendship->requester->name} wants to connect.",
            'data'  => [
                'type'          => 'friend_request',
                'friendship_id' => (string) $this->friendship->id,
                // FCM data values must be strings
            ],
        ];
    }
}