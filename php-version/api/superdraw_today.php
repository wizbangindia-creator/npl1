<?php
require_once __DIR__ . '/../config.php';
try {
    bootstrap();
    $date = today_ist();
    ensure_super_draw($date);
    json_response(build_super_response($date));
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
