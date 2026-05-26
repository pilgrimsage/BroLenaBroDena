<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GuestContact;
use Illuminate\Http\Request;

class GuestContactController extends Controller
{
    // List all my guest contacts
    public function index(Request $request)
    {
        $guests = GuestContact::where('creator_id', $request->user()->id)
            ->with('resolvedUser:id,name,email')
            ->get()
            ->map(function ($guest) {
                return [
                    'id'          => $guest->id,
                    'name'        => $guest->name,
                    'email'       => $guest->email,
                    'phone'       => $guest->phone,
                    'is_resolved' => $guest->isResolved(),
                    'joined_as'   => $guest->resolvedUser
                        ? ['id' => $guest->resolvedUser->id, 'name' => $guest->resolvedUser->name]
                        : null,
                ];
            });

        return response()->json($guests);
    }

    // Create a guest contact manually (without a transaction)
    public function store(Request $request)
    {
        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:20',
        ]);

        $guest = GuestContact::firstOrCreate(
            ['creator_id' => $request->user()->id, 'email' => $request->email],
            ['name' => $request->name, 'phone' => $request->phone]
        );

        return response()->json($guest, 201);
    }

    // Remove a guest contact
    public function destroy(Request $request, GuestContact $guest)
    {
        if ($guest->creator_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $guest->delete();

        return response()->json(['message' => 'Guest contact removed.']);
    }
}