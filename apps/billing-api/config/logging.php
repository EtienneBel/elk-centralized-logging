<?php

use Monolog\Handler\StreamHandler;
use App\Logging\ElkFormatter;

return [
    'default'      => env('LOG_CHANNEL', 'elk'),
    'deprecations' => ['channel' => 'null', 'trace' => false],
    'channels'     => [
        'elk' => [
            'driver'    => 'monolog',
            'handler'   => StreamHandler::class,
            'with'      => ['stream' => storage_path('logs/elk.log')],
            'formatter' => ElkFormatter::class,
            'level'     => env('LOG_LEVEL', 'debug'),
        ],
        'null'      => ['driver' => 'monolog', 'handler' => Monolog\Handler\NullHandler::class],
        'emergency' => ['path' => storage_path('logs/laravel.log')],
    ],
];
