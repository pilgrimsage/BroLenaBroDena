<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\GuestContact;

class Transaction extends Model
{
    protected $fillable = [
        'creator_id', 'payer_id', 'payee_id',
        'amount', 'note', 'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    // ── Relationships ────────────────────────────────────────────────

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payer_id');
    }

    public function payee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payee_id');
    }

    // ── Local Scopes ─────────────────────────────────────────────────

    // Usage: Transaction::confirmed()->get()
    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', 'confirmed');
    }

    // Usage: Transaction::between(1, 2)->get()
    public function scopeBetween(Builder $query, int $userId, ?int $friendId = null, ?int $guestId = null): Builder
    {
        if ($friendId) {
            // Both are registered users
            return $query->where(function ($q) use ($userId, $friendId) {
                $q->where('payer_id', $userId)->where('payee_id', $friendId);
            })->orWhere(function ($q) use ($userId, $friendId) {
                $q->where('payer_id', $friendId)->where('payee_id', $userId);
            });
        }

        if ($guestId) {
            // One party is a guest
            return $query->where(function ($q) use ($userId, $guestId) {
                $q->where('payer_id', $userId)->where('payee_guest_id', $guestId);
            })->orWhere(function ($q) use ($userId, $guestId) {
                $q->where('payer_guest_id', $guestId)->where('payee_id', $userId);
            });
        }

        return $query;
    }

    // Guest relationships
    public function payerGuest(): BelongsTo
    {
        return $this->belongsTo(GuestContact::class, 'payer_guest_id');
    }

    public function payeeGuest(): BelongsTo
    {
        return $this->belongsTo(GuestContact::class, 'payee_guest_id');
    }

    // Helper — who actually paid (user or guest)
    public function getPayerNameAttribute(): string
    {
        if ($this->payer_id) return $this->payer->name ?? 'Unknown';
        if ($this->payer_guest_id) return $this->payerGuest->name ?? 'Guest';
        return 'Unknown';
    }

    // Helper — who owes (user or guest)
    public function getPayeeNameAttribute(): string
    {
        if ($this->payee_id) return $this->payee->name ?? 'Unknown';
        if ($this->payee_guest_id) return $this->payeeGuest->name ?? 'Guest';
        return 'Unknown';
    }
}