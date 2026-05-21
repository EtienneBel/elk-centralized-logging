<?php

namespace Tests\Feature;

use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    public function test_active_user_returns_200(): void
    {
        $response = $this->get('/subscription?userId=alice');
        $response->assertStatus(200);
        $response->assertJson(['status' => 'active']);
    }

    public function test_suspended_user_returns_200_with_suspended_status(): void
    {
        $response = $this->get('/subscription?userId=suspended');
        $response->assertStatus(200);
        $response->assertJson(['status' => 'suspended']);
    }

    public function test_unknown_user_returns_404(): void
    {
        $response = $this->get('/subscription?userId=unknown');
        $response->assertStatus(404);
    }

    public function test_health_endpoint_returns_ok(): void
    {
        $response = $this->get('/health');
        $response->assertStatus(200);
        $response->assertJson(['status' => 'ok']);
    }
}
