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
  <link rel="stylesheet" href="<?= asset('assets/style.css') ?>" />
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
          <a href="logout.php" class="ss-btn-ghost">↩ Sign out</a>
        </div>
      </header>

      <div class="ss-admin-clock">🕒 IST <span id="admin-clock">--:--:--</span></div>

      <!-- Upcoming slot changer -->
      <div class="ss-card ss-upcoming-card">
        <div class="ss-upcoming-head">
          <span class="ss-upcoming-label">Upcoming Draw</span>
          <span class="ss-upcoming-time" id="upcoming-time">—</span>
        </div>
        <div class="ss-upcoming-status" id="upcoming-status"></div>
        <div class="ss-upcoming-inputs" id="upcoming-inputs">
          <div class="ss-upcoming-col">
            <span class="ss-upcoming-col-label col-a-h">A</span>
            <input id="up-a" class="ss-admin-input col-a-input" maxlength="2" />
          </div>
          <div class="ss-upcoming-col">
            <span class="ss-upcoming-col-label col-b-h">B</span>
            <input id="up-b" class="ss-admin-input col-b-input" maxlength="2" />
          </div>
          <div class="ss-upcoming-col">
            <span class="ss-upcoming-col-label col-c-h">C</span>
            <input id="up-c" class="ss-admin-input col-c-input" maxlength="2" />
          </div>
        </div>
        <div class="ss-upcoming-actions" id="upcoming-actions">
          <button id="up-save" type="button" class="ss-btn-primary">💾 Save</button>
          <button id="up-hold" type="button" class="ss-btn-ghost">⏸ Hold Result</button>
          <button id="up-release" type="button" class="ss-btn-primary" style="display:none">▶ Release</button>
        </div>
        <div class="ss-empty" id="upcoming-empty" style="display:none">— no more draws today —</div>
      </div>

      <!-- Super draw -->
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

      <!-- Change password -->
      <div class="ss-super-editor">
        <div class="ss-super-editor-head">
          🔑 <span class="ss-super-editor-title">Change Login Password</span>
        </div>
        <form id="password-form" class="ss-password-form">
          <div>
            <label for="pwd-current">Current password</label>
            <input id="pwd-current" class="ss-input" type="password" required placeholder="••••••••" />
          </div>
          <div>
            <label for="pwd-new">New password</label>
            <input id="pwd-new" class="ss-input" type="password" required placeholder="At least 6 characters" />
          </div>
          <div>
            <label for="pwd-confirm">Confirm new password</label>
            <input id="pwd-confirm" class="ss-input" type="password" required placeholder="Re-enter new password" />
          </div>
          <button type="submit" id="pwd-submit" class="ss-btn-primary">🛡 Update Password</button>
        </form>
      </div>
    </div>
  </div>

  <div id="toast-container" class="toast-container"></div>

  <script src="<?= asset('assets/app.js') ?>"></script>
  <script src="<?= asset('assets/admin.js') ?>"></script>
</body>
</html>
