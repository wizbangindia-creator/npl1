<?php
require_once __DIR__ . '/../config.php';
try {
    bootstrap();
    $date = today_ist();
    ensure_board($date);
    json_response(build_board_response($date));
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
