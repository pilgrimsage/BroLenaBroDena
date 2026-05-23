<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Settlement extends Model
{
    protected $fillable = [
        'from_user_id', 'to_user_id', 'amount',
        'method', 'reference', 'note',
        'status', 'settled_at',
    ];

    protected $casts = [
        'amount'     => 'decimal:2',
        'settled_at' => 'datetime',
    ];

    // ── Relationships ────────────────────────────────────────────────

    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    // Settlements between two specific users (either direction)
    public function scopeBetween(Builder $query, int $a, int $b): Builder
    {
        return $query->where(function ($q) use ($a, $b) {
            $q->where('from_user_id', $a)->where('to_user_id', $b);
        })->orWhere(function ($q) use ($a, $b) {
            $q->where('from_user_id', $b)->where('to_user_id', $a);
        });
    }
}