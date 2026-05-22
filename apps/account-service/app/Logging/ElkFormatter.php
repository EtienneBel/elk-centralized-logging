<?php

namespace App\Logging;

use Monolog\Formatter\FormatterInterface;
use Monolog\LogRecord;

class ElkFormatter implements FormatterInterface
{
    public function format(LogRecord $record): string
    {
        $data = array_merge(
            [
                'datetime'    => $record->datetime->format('Y-m-d\TH:i:s.v\Z'),
                'level_name'  => $record->level->getName(),
                'message'     => $record->message,
                'application' => env('APP_NAME', 'account-service'),
                'environment' => env('APP_ENV', 'production'),
            ],
            $record->context,
            $record->extra
        );

        return json_encode($data, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    }

    public function formatBatch(array $records): string
    {
        return implode('', array_map([$this, 'format'], $records));
    }
}
