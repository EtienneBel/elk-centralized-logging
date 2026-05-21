<?php

namespace Tests\Feature;

use App\Services\AccountService;
use Tests\TestCase;

class TransferTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->app->forgetInstance(AccountService::class);
    }

    public function test_valid_transfer_debits_sender_and_credits_receiver(): void
    {
        $response = $this->postJson('/execute', [
            'from'   => 'ACC001',
            'to'     => 'ACC002',
            'amount' => 100,
        ]);
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $response->assertJsonPath('fromBalance', 4900.0);
        $response->assertJsonPath('toBalance',   3100.0);
    }

    public function test_insufficient_funds_returns_402(): void
    {
        $response = $this->postJson('/execute', [
            'from'   => 'ACC004',
            'to'     => 'ACC001',
            'amount' => 500,
        ]);
        $response->assertStatus(402);
        $response->assertJsonStructure(['error']);
    }

    public function test_unknown_sender_returns_404(): void
    {
        $response = $this->postJson('/execute', [
            'from'   => 'ACC999',
            'to'     => 'ACC001',
            'amount' => 50,
        ]);
        $response->assertStatus(404);
    }

    public function test_get_account_returns_balance(): void
    {
        $response = $this->getJson('/account/ACC001');
        $response->assertStatus(200);
        $response->assertJsonStructure(['id', 'owner', 'balance']);
        $response->assertJsonPath('balance', 5000.0);
    }

    public function test_get_unknown_account_returns_404(): void
    {
        $response = $this->getJson('/account/ACC999');
        $response->assertStatus(404);
    }

    public function test_health_returns_ok(): void
    {
        $response = $this->getJson('/health');
        $response->assertStatus(200);
        $response->assertJson(['status' => 'ok', 'service' => 'account-service']);
    }

    public function test_zero_amount_returns_422(): void
    {
        $response = $this->postJson('/execute', [
            'from'   => 'ACC001',
            'to'     => 'ACC002',
            'amount' => 0,
        ]);
        $response->assertStatus(422);
    }

    public function test_missing_fields_returns_422(): void
    {
        $response = $this->postJson('/execute', []);
        $response->assertStatus(422);
        $response->assertJsonStructure(['message', 'errors']);
    }
}
