<?php require_once __DIR__ . '/config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NPL1 · Super Draw</title>
  <link rel="stylesheet" href="<?= asset('assets/style.css') ?>" />
</head>
<body>
  <div class="ss-page">
    <div class="ss-container">
      <?php
        $page_title = 'NPL1';
        $tag        = '👑 Super Draw · One Number Per Day';
        $sub_html   = '<span id="sd-date">—</span>'
                    . '<span class="ss-divider">·</span>'
                    . '<span>IST&nbsp;<span id="sd-clock">--:--:--</span></span>'
                    . '<span class="ss-divider">·</span>'
                    . '<span>Reveals at <span id="sd-reveal-time">11:30 AM</span></span>';
        $toolbar_html = '<a href="index.php" class="ss-nav-link">🏠 Main Board</a>'
                     . '<div class="ss-date-picker">'
                     . '  <input type="date" id="sd-date-picker" class="ss-date-input" max="' . htmlspecialchars(today_ist()) . '" />'
                     . '  <button id="sd-back-today" type="button" class="ss-btn-ghost-sm" style="display:none">Live today</button>'
                     . '</div>'
                     . '<a href="admin_login.php" class="ss-admin-link">🔒 Admin</a>';
        include __DIR__ . '/_hero.php';
      ?>

      <div class="sd-card" id="sd-card">
        <div class="sd-badge">✦ Super Draw</div>
        <div class="sd-label">Winning Number</div>
        <div class="sd-number" id="sd-number">--</div>
        <div class="sd-locked-hint" id="sd-locked-hint" style="display:none"></div>
        <div class="sd-date-info" id="sd-date-info"></div>
      </div>

      <footer class="ss-footer">
        <span id="sd-footer-text">One number per day · Auto-updates every 15 seconds</span>
      </footer>
    </div>
  </div>

  <script src="<?= asset('assets/app.js') ?>"></script>
  <script>NPL1.initSuperDraw();</script>
</body>
</html>
