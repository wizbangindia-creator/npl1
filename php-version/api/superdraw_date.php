<?php
require_once __DIR__ . '/../config.php';
try {
    bootstrap();
    $date = $_GET['date'] ?? '';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) json_response(['error' => 'Invalid date'], 400);
    $today = today_ist();
    if ($date > $today) json_response(['error' => 'Cannot view future dates'], 400);
    if ($date === $today) ensure_super_draw($date);
    $resp = build_super_response($date);
    if (!$resp) json_response(['error' => 'No super draw for this date'], 404);
    json_response($resp);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
