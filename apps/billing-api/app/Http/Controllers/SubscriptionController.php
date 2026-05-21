<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SubscriptionController extends Controller
{
    public function show(Request $request)
    {
        $userId        = $request->query('userId');
        $correlationId = $request->header('X-Correlation-ID', 'none');

        if ($userId === null) {
            return response()->json(['error' => 'userId is required', 'correlationId' => $correlationId], 422);
        }

        $context       = [
            'application'   => 'billing-api',
            'environment'   => config('app.env'),
            'service'       => 'laravel',
            'correlationId' => $correlationId,
            'userId'        => $userId,
        ];

        return match ($userId) {
            'suspended' => $this->suspended($context),
            'unknown'   => $this->notFound($context),
            default     => $this->active($context),
        };
    }

    public function health(Request $request)
    {
        $correlationId = $request->header('X-Correlation-ID', 'none');

        Log::info('Health check', [
            'application'   => 'billing-api',
            'environment'   => config('app.env'),
            'service'       => 'laravel',
            'correlationId' => $correlationId,
        ]);

        return response()->json(['status' => 'ok', 'service' => 'billing-api']);
    }

    private function active(array $ctx)
    {
        Log::info('Subscription active', $ctx);

        return response()->json(['status' => 'active', 'userId' => $ctx['userId']]);
    }

    private function suspended(array $ctx)
    {
        Log::warning('Subscription suspended', $ctx);

        return response()->json(['status' => 'suspended', 'userId' => $ctx['userId']]);
    }

    private function notFound(array $ctx)
    {
        Log::error('User not found in billing', $ctx);

        return response()->json(['error' => 'User not found', 'correlationId' => $ctx['correlationId']], 404);
    }
}
