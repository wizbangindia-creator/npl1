<?php
require_once __DIR__ . '/../config.php';
try {
    bootstrap();
    require_admin_or_json();

    $in = json_input();
    $date   = $in['date']   ?? '';
    $hour   = isset($in['hour'])   ? (int)$in['hour']   : -1;
    $minute = isset($in['minute']) ? (int)$in['minute'] : -1;
    $a = $in['a'] ?? '';
    $b = $in['b'] ?? '';
    $c = $in['c'] ?? '';

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date))
        json_response(['error' => 'Invalid date'], 400);
    foreach (['A' => $a, 'B' => $b, 'C' => $c] as $k => $v) {
        if (!preg_match('/^\d{2}$/', (string)$v))
            json_response(['error' => "Column $k must be a 2-digit number (00-99)"], 400);
    }
    if ($date === today_ist()) ensure_board($date);

    $pdo = db();
    $exists = $pdo->prepare('SELECT 1 FROM slots WHERE date=? AND hour=? AND minute=?');
    $exists->execute([$date, $hour, $minute]);
    if (!$exists->fetch()) json_response(['error' => 'Slot not found'], 404);

    $upd = $pdo->prepare('UPDATE slots SET a=?, b=?, c=? WHERE date=? AND hour=? AND minute=?');
    $upd->execute([$a, $b, $c, $date, $hour, $minute]);
    json_response(['success' => true]);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
