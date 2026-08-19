<?php
require_once __DIR__ . '/config.php';
bootstrap();
require_admin_or_redirect('admin_login.php');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NPL1 · Admin Panel</title>
  <link rel="stylesheet" href="assets/style.css" />
</head>
<body>
  <div class="ss-page">
    <div class="ss-container">
      <header class="ss-admin-header">
        <div>
          <h1 class="ss-admin-title">Admin Panel</h1>
          <p class="ss-admin-sub">Signed in as <?= htmlspecialchars($_SESSION['admin_email']) ?></p>
        </div>
        <div class="ss-admin-actions">
          <a href="index.php" class="ss-btn-ghost">🏠 View board</a>
          <button id="regenerate-btn" type="button" class="ss-btn-ghost">🎲 Regenerate today</button>
          <a href="logout.php" class="ss-btn-ghost">↩ Sign out</a>
        </div>
      </header>

      <div id="super-editor" class="ss-super-editor" style="display:none">
        <div class="ss-super-editor-head">
          👑 <span class="ss-super-editor-title">Super Draw (11:30 AM)</span>
          <span class="ss-super-editor-date" id="super-date"></span>
        </div>
        <div class="ss-super-editor-body">
          <input id="super-input" class="ss-super-input" maxlength="2" placeholder="00" />
          <button id="super-save" type="button" class="ss-btn-primary">💾 Save</button>
          <span class="ss-super-hint" id="super-hint"></span>
        </div>
      </div>

      <div class="ss-admin-toolbar">
        <span class="ss-admin-picker-label">Date</span>
        <input type="date" id="admin-date-picker" class="ss-date-input" max="<?= htmlspecialchars(today_ist()) ?>" value="<?= htmlspecialchars(today_ist()) ?>" />
        <button id="admin-reload" type="button" class="ss-btn-ghost">↻ Reload</button>
      </div>

      <div class="ss-card">
        <div class="ss-table-wrap">
          <table class="ss-table ss-admin-table">
            <thead>
              <tr>
                <th class="ss-col-time-h">Time</th>
                <th class="col-a-h">A</th>
                <th class="col-b-h">B</th>
                <th class="col-c-h">C</th>
                <th class="ss-col-action-h">Action</th>
              </tr>
            </thead>
            <tbody id="admin-tbody">
              <tr><td colspan="5" class="ss-empty">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div id="toast-container" class="toast-container"></div>

  <script src="assets/app.js"></script>
  <script src="assets/admin.js"></script>
</body>
</html>
