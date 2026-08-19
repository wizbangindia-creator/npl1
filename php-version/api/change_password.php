<?php
require_once __DIR__ . '/../config.php';
try {
    bootstrap();
    require_admin_or_json();

    $in      = json_input();
    $current = $in['current_password'] ?? '';
    $new     = $in['new_password'] ?? '';

    [$ok, $err] = change_admin_password($_SESSION['admin_email'], $current, $new);
    if (!$ok) json_response(['error' => $err], 400);
    json_response(['success' => true]);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
