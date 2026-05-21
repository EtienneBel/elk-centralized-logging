<?php

use App\Http\Controllers\AccountController;
use Illuminate\Support\Facades\Route;

Route::post('/execute',        [AccountController::class, 'execute']);
Route::get('/account/{id}',    [AccountController::class, 'show']);
Route::get('/health',          [AccountController::class, 'health']);
