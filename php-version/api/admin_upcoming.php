<?php
require_once __DIR__ . '/../config.php';
try {
    bootstrap();
    require_admin_or_json();

    $date = today_ist();
    ensure_board($date);

    $pdo = db();
    $stmt = $pdo->prepare('SELECT hour, minute, a, b, c, held, released FROM slots WHERE date = ? ORDER BY hour, minute');
    $stmt->execute([$date]);
    $rows = $stmt->fetchAll();

    $now = new DateTime('now', new DateTimeZone('Asia/Kolkata'));
    $cur_min = (int)$now->format('H') * 60 + (int)$now->format('i');

    foreach ($rows as $i => $r) {
        [$revealed, $remaining] = slot_reveal_state($r, $date, $now);
        if (!$revealed) {
            $h = (int)$r['hour']; $m = (int)$r['minute'];
            json_response([
                'date'                  => $date,
                'current_time_ist'      => $now->format('h:i:s A'),
                'index'                 => $i,
                'time_reached'          => ($h * 60 + $m) <= $cur_min,
                'hold_remaining_seconds'=> $remaining,
                'slot' => [
                    'time'     => format_time_12h($h, $m),
                    'hour'     => $h,
                    'minute'   => $m,
                    'a'        => $r['a'],
                    'b'        => $r['b'],
                    'c'        => $r['c'],
                    'held'     => !empty($r['held']),
                    'released' => !empty($r['released']),
                ],
            ]);
        }
    }

    // Nothing left to reveal today
    json_response([
        'date'                  => $date,
        'current_time_ist'      => $now->format('h:i:s A'),
        'index'                 => -1,
        'time_reached'          => false,
        'hold_remaining_seconds'=> null,
        'slot'                  => null,
    ]);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
