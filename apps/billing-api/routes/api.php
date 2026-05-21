<?php

use App\Http\Controllers\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::get('/subscription', [SubscriptionController::class, 'show']);
Route::get('/health', [SubscriptionController::class, 'health']);
