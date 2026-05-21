<?php

namespace App\Providers;

use App\Services\AccountService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AccountService::class);
    }

    public function boot(): void {}
}
