<?php

namespace App\Services;

class AccountService
{
    private array $accounts = [
        'ACC001' => ['owner' => 'Alice',   'balance' => 5000.00],
        'ACC002' => ['owner' => 'Bob',     'balance' => 3000.00],
        'ACC003' => ['owner' => 'Charlie', 'balance' => 1500.00],
        'ACC004' => ['owner' => 'Eve',     'balance' => 150.00],
    ];

    public function find(string $id): ?array
    {
        $account = $this->accounts[$id] ?? null;
        if ($account === null) return null;
        return array_merge(['id' => $id], $account);
    }

    public function transfer(string $from, string $to, float $amount): array
    {
        if ($amount <= 0) {
            throw new \RuntimeException("Amount must be positive", 422);
        }
        if (!isset($this->accounts[$from])) {
            throw new \RuntimeException("Account not found: {$from}", 404);
        }
        if (!isset($this->accounts[$to])) {
            throw new \RuntimeException("Account not found: {$to}", 404);
        }
        if ($this->accounts[$from]['balance'] < $amount) {
            throw new \RuntimeException("Insufficient funds", 402);
        }

        $this->accounts[$from]['balance'] -= $amount;
        $this->accounts[$to]['balance']   += $amount;

        return [
            'success'     => true,
            'fromBalance' => $this->accounts[$from]['balance'],
            'toBalance'   => $this->accounts[$to]['balance'],
        ];
    }
}
