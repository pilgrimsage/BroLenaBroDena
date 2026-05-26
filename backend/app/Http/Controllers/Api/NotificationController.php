<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // All notifications — paginated
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()         // built-in relationship from Notifiable trait
            ->latest()
            ->paginate(20);

        return response()->json([
            'unread_count'  => $request->user()->unreadNotifications()->count(),
            'notifications' => $notifications,
        ]);
    }

    // Only unread
    public function unread(Request $request)
    {
        return response()->json(
            $request->user()->unreadNotifications()->latest()->get()
        );
    }

    // Mark one notification as read
    public function markRead(Request $request, string $id)
    {
        // Notification IDs are UUIDs (strings), not integers
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->markAsRead();
        // sets read_at to current timestamp

        return response()->json(['message' => 'Marked as read.']);
    }

    // Mark all as read at once
    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications()->update([
            'read_at' => now(),
        ]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    // Delete a notification
    public function destroy(Request $request, string $id)
    {
        $request->user()
            ->notifications()
            ->findOrFail($id)
            ->delete();

        return response()->json(['message' => 'Notification deleted.']);
    }

    // Mobile app calls this on launch to register/update FCM token
    public function updateFcmToken(Request $request)
    {
        $request->validate([
            'fcm_token' => 'required|string',
        ]);

        $request->user()->update(['fcm_token' => $request->fcm_token]);

        return response()->json(['message' => 'FCM token updated.']);
    }
}