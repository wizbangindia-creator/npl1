<?php
// =============================================================
//  NPL1 — Shivshaktiloto  |  Shared config for all PHP files
// =============================================================
//  1. Edit the four DB constants below to match your Hostinger DB.
//  2. Change ADMIN_PASSWORD before going live.
//  3. Upload every file to your public_html folder.
// =============================================================

// ---------- Database credentials (from Hostinger hPanel) ----------
define('DB_HOST', 'localhost');
define('DB_NAME', 'YOUR_DB_NAME');       // e.g. u123456789_npl1
define('DB_USER', 'YOUR_DB_USER');       // e.g. u123456789_admin
define('DB_PASS', 'YOUR_DB_PASSWORD');

// ---------- Admin login (single admin) ----------
define('ADMIN_EMAIL',    'admin@shivshakti.local');
define('ADMIN_PASSWORD', 'shivshakti2026');   // change me before deploying

// ---------- Super-draw reveal time (IST) ----------
define('SUPER_DRAW_HOUR',   11);
define('SUPER_DRAW_MINUTE', 30);

// ---------- Result hold window (seconds) ----------
define('HOLD_MAX_SECONDS', 60);

date_default_timezone_set('Asia/Kolkata');
if (session_status() === PHP_SESSION_NONE) session_start();

// -------------------- DB connection --------------------
function db() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}

// -------------------- Helpers --------------------
function today_ist() {
    return (new DateTime('now', new DateTimeZone('Asia/Kolkata')))->format('Y-m-d');
}
function two_digit_random() {
    return str_pad((string) mt_rand(0, 99), 2, '0', STR_PAD_LEFT);
}
function format_time_12h($h, $m) {
    $period = $h < 12 ? 'AM' : 'PM';
    $dh = $h % 12; if ($dh === 0) $dh = 12;
    return sprintf('%d:%02d %s', $dh, $m, $period);
}
function generate_slot_times() {
    $slots = [];
    for ($m = 9 * 60;      $m <= 17 * 60; $m += 15) $slots[] = [intdiv($m,60), $m%60];
    for ($m = 17 * 60 + 10; $m <= 22 * 60; $m += 10) $slots[] = [intdiv($m,60), $m%60];
    return $slots;
}
function json_input() {
    return json_decode(file_get_contents('php://input'), true) ?: [];
}
function json_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Cache-busting asset URL: appends ?v=<file-modified-time> so browsers always
// fetch the newest CSS/JS after you re-upload files (fixes stale-cache issues).
function asset($rel) {
    $full = __DIR__ . '/' . ltrim($rel, '/');
    $v = @filemtime($full);
    return $rel . ($v ? ('?v=' . $v) : '');
}

// -------------------- Board persistence --------------------
function ensure_board($date) {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM slots WHERE date = ?');
    $stmt->execute([$date]);
    if ((int)$stmt->fetchColumn() > 0) return;

    $ins = $pdo->prepare('INSERT IGNORE INTO slots (date, hour, minute, a, b, c) VALUES (?, ?, ?, ?, ?, ?)');
    foreach (generate_slot_times() as [$h, $m]) {
        $ins->execute([$date, $h, $m, two_digit_random(), two_digit_random(), two_digit_random()]);
    }
}

function build_board_response($date, $admin_view = false) {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT hour, minute, a, b, c, held, released FROM slots WHERE date = ? ORDER BY hour, minute');
    $stmt->execute([$date]);
    $rows = $stmt->fetchAll();

    $today   = today_ist();
    $is_today = ($date === $today);
    $now = new DateTime('now', new DateTimeZone('Asia/Kolkata'));

    $slots = []; $latest = -1;
    foreach ($rows as $i => $r) {
        $h = (int)$r['hour']; $m = (int)$r['minute'];
        if ($admin_view) {
            $revealed = true;
        } else {
            [$revealed, $rem] = slot_reveal_state($r, $date, $now);
        }
        if ($revealed) $latest = $i;
        $slots[] = [
            'time'     => format_time_12h($h, $m),
            'hour'     => $h,
            'minute'   => $m,
            'a'        => $revealed ? $r['a'] : null,
            'b'        => $revealed ? $r['b'] : null,
            'c'        => $revealed ? $r['c'] : null,
            'revealed' => $revealed,
            'held'     => !empty($r['held']),
            'released' => !empty($r['released']),
        ];
    }
    return [
        'date'               => $date,
        'current_time_ist'   => $now->format('h:i:s A'),
        'current_hour'       => (int)$now->format('H'),
        'current_minute'     => (int)$now->format('i'),
        'slots'              => $slots,
        'is_today'           => $is_today,
        'latest_slot_index'  => $admin_view && !$is_today ? -1 : $latest,
    ];
}

// Public reveal state for one slot row: returns [revealed(bool), hold_remaining(int|null)]
function slot_reveal_state($r, $date, $now) {
    $today = $now->format('Y-m-d');
    if ($date < $today) return [true, null];
    if ($date !== $today) return [false, null];
    $h = (int)$r['hour']; $m = (int)$r['minute'];
    $slot_min = $h * 60 + $m;
    $cur_min  = (int)$now->format('H') * 60 + (int)$now->format('i');
    if ($slot_min > $cur_min) return [false, null];           // reveal time not reached
    $held     = !empty($r['held']);
    $released = !empty($r['released']);
    if (!$held || $released) return [true, null];
    $slot_dt  = (clone $now)->setTime($h, $m, 0);
    $hold_end = (clone $slot_dt)->modify('+' . HOLD_MAX_SECONDS . ' seconds');
    if ($now >= $hold_end) return [true, null];               // 60s window elapsed -> auto reveal
    $remaining = ($hold_end->getTimestamp() - $now->getTimestamp()) + 1;
    return [false, (int)$remaining];
}

// -------------------- Super Draw --------------------
function ensure_super_draw($date) {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT 1 FROM super_draws WHERE date = ?');
    $stmt->execute([$date]);
    if ($stmt->fetch()) return;
    $ins = $pdo->prepare('INSERT IGNORE INTO super_draws (date, number) VALUES (?, ?)');
    $ins->execute([$date, two_digit_random()]);
}

function build_super_response($date, $admin_view = false) {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT number FROM super_draws WHERE date = ?');
    $stmt->execute([$date]);
    $row = $stmt->fetch();
    if (!$row) return null;

    $today = today_ist();
    $is_today = ($date === $today);
    $is_past  = ($date < $today);
    $now = new DateTime('now', new DateTimeZone('Asia/Kolkata'));
    $cur_min = (int)$now->format('H') * 60 + (int)$now->format('i');
    $reveal_min = SUPER_DRAW_HOUR * 60 + SUPER_DRAW_MINUTE;

    if ($admin_view || $is_past)   $revealed = true;
    elseif ($is_today)             $revealed = $cur_min >= $reveal_min;
    else                           $revealed = false;

    return [
        'date'             => $date,
        'number'           => $revealed ? $row['number'] : null,
        'reveal_time'      => format_time_12h(SUPER_DRAW_HOUR, SUPER_DRAW_MINUTE),
        'current_time_ist' => $now->format('h:i:s A'),
        'revealed'         => $revealed,
        'is_today'         => $is_today,
    ];
}

// -------------------- Auth --------------------
function is_admin() { return !empty($_SESSION['admin_email']); }

function require_admin_or_json() {
    if (!is_admin()) json_response(['error' => 'Not authenticated'], 401);
}
function require_admin_or_redirect($url = 'admin_login.php') {
    if (!is_admin()) { header('Location: ' . $url); exit; }
}

// Seed admin row on first use (uses password_hash bcrypt).
// IMPORTANT: never overwrites an existing admin's password. Once the row exists,
// the in-app "Change Password" is the source of truth; config.php ADMIN_PASSWORD is
// only used to create the very first admin row.
function seed_admin() {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT id FROM admins WHERE email = ?');
    $stmt->execute([ADMIN_EMAIL]);
    if (!$stmt->fetch()) {
        $hash = password_hash(ADMIN_PASSWORD, PASSWORD_BCRYPT);
        $ins = $pdo->prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)');
        $ins->execute([ADMIN_EMAIL, $hash]);
    }
}

// Change the logged-in admin's password. Returns [ok(bool), error(string|null)].
function change_admin_password($email, $current, $new) {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT password_hash FROM admins WHERE email = ?');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($current, $row['password_hash'])) {
        return [false, 'Current password is incorrect'];
    }
    if (strlen($new) < 6) {
        return [false, 'New password must be at least 6 characters'];
    }
    if ($new === $current) {
        return [false, 'New password must be different from current password'];
    }
    $hash = password_hash($new, PASSWORD_BCRYPT);
    $upd = $pdo->prepare('UPDATE admins SET password_hash = ? WHERE email = ?');
    $upd->execute([$hash, $email]);
    return [true, null];
}

// -------------------- Schema auto-migration (safe, keeps existing data) --------------------
function column_exists($table, $col) {
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $col]);
    return (int)$stmt->fetchColumn() > 0;
}

function migrate_schema() {
    $pdo = db();
    try {
        if (!column_exists('slots', 'held')) {
            $pdo->exec('ALTER TABLE slots ADD COLUMN held TINYINT(1) NOT NULL DEFAULT 0');
        }
        if (!column_exists('slots', 'released')) {
            $pdo->exec('ALTER TABLE slots ADD COLUMN released TINYINT(1) NOT NULL DEFAULT 0');
        }
        if (!column_exists('admins', 'password_changed')) {
            $pdo->exec('ALTER TABLE admins ADD COLUMN password_changed TINYINT(1) NOT NULL DEFAULT 0');
        }
    } catch (Throwable $e) {
        // Non-fatal: if the DB user lacks ALTER rights the app still runs on existing schema.
    }
}

function bootstrap() { migrate_schema(); seed_admin(); }
