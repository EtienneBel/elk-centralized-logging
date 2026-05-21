<?php

namespace App\Http\Controllers;

use App\Services\AccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AccountController extends Controller
{
    public function __construct(private AccountService $service) {}

    public function execute(Request $request): JsonResponse
    {
        $request->validate([
            'from'   => 'required|string',
            'to'     => 'required|string',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $correlationId = $request->header('X-Correlation-ID', 'none');
        $from   = $request->input('from');
        $to     = $request->input('to');
        $amount = (float) $request->input('amount');

        try {
            $result = $this->service->transfer($from, $to, $amount);

            Log::channel('elk')->info('Transfer executed', [
                'correlationId' => $correlationId,
                'from'          => $from,
                'to'            => $to,
                'amount'        => $amount,
                'fromBalance'   => $result['fromBalance'],
                'toBalance'     => $result['toBalance'],
            ]);

            if ($result['fromBalance'] < 100) {
                Log::channel('elk')->warning('Low balance after transfer', [
                    'correlationId' => $correlationId,
                    'accountId'     => $from,
                    'balance'       => $result['fromBalance'],
                ]);
            }

            return response()->json($result, 200, [], JSON_PRESERVE_ZERO_FRACTION);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() ?: 500;
            Log::channel('elk')->error($e->getMessage(), [
                'correlationId' => $correlationId,
                'from'          => $from,
                'amount'        => $amount,
            ]);
            return response()->json(['error' => $e->getMessage()], $code);
        }
    }

    public function show(string $id): JsonResponse
    {
        $account = $this->service->find($id);
        if ($account === null) {
            return response()->json(['error' => 'Account not found'], 404);
        }
        return response()->json($account, 200, [], JSON_PRESERVE_ZERO_FRACTION);
    }

    public function health(): JsonResponse
    {
        Log::channel('elk')->info('Health check', ['service' => 'account-service']);
        return response()->json(['status' => 'ok', 'service' => 'account-service']);
    }
}
