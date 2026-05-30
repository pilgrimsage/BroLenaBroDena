<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    public function send(string $phone, string $message): bool
    {
        // In development — just log the OTP, don't send SMS
        if (app()->environment('local')) {
            Log::info("SMS to {$phone}: {$message}");
            return true;
        }

        return $this->sendViaSmsProvider($phone, $message);
    }

    private function sendViaSmsProvider(string $phone, string $message): bool
    {
        // ── Fast2SMS (India) ────────────────────────────────────────
        // Sign up at fast2sms.com — free credits for testing
        // Add FAST2SMS_KEY to your .env

        try {
            $response = Http::withHeaders([
                'authorization' => env('FAST2SMS_KEY'),
            ])->post('https://www.fast2sms.com/dev/bulkV2', [
                'route'       => 'otp',
                'variables_values' => $message,
                'flash'       => 0,
                'numbers'     => $phone,
            ]);

            return $response->successful();

        } catch (\Throwable $e) {
            Log::error("SMS failed: " . $e->getMessage());
            return false;
        }
    }
}