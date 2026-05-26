<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuestContact extends Model
{
    protected $fillable = [
        'creator_id', 'name', 'email', 'phone', 'resolved_user_id',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    // The real user account once they register
    public function resolvedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_user_id');
    }

    public function isResolved(): bool
    {
        return $this->resolved_user_id !== null;
    }
}