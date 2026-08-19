<?php
require_once __DIR__ . '/../config.php';
try {
    bootstrap();
    require_admin_or_json();
    $in = json_input();
    $date   = $in['date']   ?? '';
    $number = $in['number'] ?? '';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date))
        json_response(['error' => 'Invalid date'], 400);
    if (!preg_match('/^\d{2}$/', (string)$number))
        json_response(['error' => 'Number must be a 2-digit number (00-99)'], 400);
    if ($date === today_ist()) ensure_super_draw($date);

    $pdo = db();
    $exists = $pdo->prepare('SELECT 1 FROM super_draws WHERE date = ?');
    $exists->execute([$date]);
    if (!$exists->fetch()) json_response(['error' => 'No super draw for this date'], 404);
    $upd = $pdo->prepare('UPDATE super_draws SET number = ? WHERE date = ?');
    $upd->execute([$number, $date]);
    json_response(['success' => true]);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
