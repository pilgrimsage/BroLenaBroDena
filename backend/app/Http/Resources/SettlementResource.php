<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SettlementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $me = $request->user();

        return [
            'id'         => $this->id,
            'amount'     => $this->amount,
            'method'     => $this->method,
            'reference'  => $this->reference,
            'note'       => $this->note,
            'status'     => $this->status,
            'settled_at' => $this->settled_at,
            'created_at' => $this->created_at,

            // Computed — from this user's perspective
            'direction' => $this->from_user_id === $me->id
                ? 'i_paid'
                : 'they_paid',

            // Nested user data — not just IDs
            'from' => [
                'id'   => $this->fromUser->id,
                'name' => $this->fromUser->name,
            ],
            'to' => [
                'id'   => $this->toUser->id,
                'name' => $this->toUser->name,
            ],
        ];
    }
}