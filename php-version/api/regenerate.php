<?php
require_once __DIR__ . '/../config.php';
try {
    bootstrap();
    require_admin_or_json();
    $date = today_ist();
    $pdo = db();
    $pdo->prepare('DELETE FROM slots WHERE date = ?')->execute([$date]);
    ensure_board($date);
    json_response(['success' => true, 'date' => $date]);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
