<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
    public function scopeBetween(Builder $query, int $a, int $b): Builder
    {
        return $query->where(function ($q) use ($a, $b) {
            $q->where('payer_id', $a)->where('payee_id', $b);
        })->orWhere(function ($q) use ($a, $b) {
            $q->where('payer_id', $b)->where('payee_id', $a);
        });
    }
}