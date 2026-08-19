<?php
require_once __DIR__ . '/../config.php';
try {
    bootstrap();
    $date = $_GET['date'] ?? '';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) json_response(['error' => 'Invalid date'], 400);
    $today = today_ist();
    if ($date > $today) json_response(['error' => 'Cannot view future dates'], 400);
    if ($date === $today) ensure_board($date);
    $resp = build_board_response($date);
    if (empty($resp['slots'])) json_response(['error' => 'No board for this date'], 404);
    json_response($resp);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
