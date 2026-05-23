<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;

use App\Models\Friendship;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // ── Relationships ──────────────────────────────────────────────────

    // Requests this user SENT
    public function sentRequests()
    {
        return $this->hasMany(Friendship::class, 'requester_id');
    }

    // Requests this user RECEIVED
    public function receivedRequests()
    {
        return $this->hasMany(Friendship::class, 'receiver_id');
    }

    // ── Helper methods ─────────────────────────────────────────────────

    // Find the friendship record between me and another user
    // Checks both directions (I sent OR they sent)
    public function friendshipWith(int $userId): ?Friendship
    {
        return Friendship::where(function ($query) use ($userId) {
            $query->where('requester_id', $this->id)
                ->where('receiver_id', $userId);
        })->orWhere(function ($query) use ($userId) {
            $query->where('requester_id', $userId)
                ->where('receiver_id', $this->id);
        })->first();
    }

    // Simple true/false — are we friends?
    public function isFriendWith(int $userId): bool
    {
        $friendship = $this->friendshipWith($userId);

        return $friendship !== null && $friendship->status === 'accepted';
    }

    // Get all accepted friends as a collection of User models
    public function friends()
    {
        // IDs of people I sent requests to (and they accepted)
        $sentToIds = $this->sentRequests()
            ->where('status', 'accepted')
            ->pluck('receiver_id');

        // IDs of people who sent me requests (and I accepted)
        $receivedFromIds = $this->receivedRequests()
            ->where('status', 'accepted')
            ->pluck('requester_id');

        // Merge both lists, get User models
        $allFriendIds = $sentToIds->merge($receivedFromIds);

        return User::whereIn('id', $allFriendIds)->get();
    }
}
