<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FcmNotification;

class FcmChannel
{
    // Laravel's service container auto-injects Messaging
    // This is dependency injection — same concept as Request in controllers
    public function __construct(protected Messaging $messaging)
    {
    }

    public function send(mixed $notifiable, Notification $notification): void
    {
        // $notifiable = the User model we're notifying
        $token = $notifiable->fcm_token;

        // No token = user hasn't logged in on mobile yet — skip silently
        if (! $token) return;

        // Notification must have a toFcm() method
        if (! method_exists($notification, 'toFcm')) return;

        $data = $notification->toFcm($notifiable);

        $message = CloudMessage::withTarget('token', $token)
            ->withNotification(
                FcmNotification::create($data['title'], $data['body'])
            )
            ->withData($data['data'] ?? []);

        try {
            $this->messaging->send($message);
        } catch (\Throwable $e) {
            // Token expired or invalid — clear it
            // Next time user opens app they'll register a new token
            $notifiable->update(['fcm_token' => null]);
        }
    }
}