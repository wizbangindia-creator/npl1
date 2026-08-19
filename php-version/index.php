<?php require_once __DIR__ . '/config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NPL1 · Main Board</title>
  <link rel="stylesheet" href="assets/style.css" />
</head>
<body>
  <div class="ss-page">
    <div class="ss-container">
      <?php
        $page_title = 'NPL1';
        $tag        = 'Main Board · 63 draws per day';
        $sub_html   = '<span id="ss-date">—</span>'
                    . '<span class="ss-divider">·</span>'
                    . '<span>IST&nbsp;<span id="ss-clock">--:--:--</span></span>'
                    . '<span class="ss-divider">·</span>'
                    . '<span id="ss-progress">0/0 revealed</span>';
        $toolbar_html = '<a href="super-draw.php" class="ss-nav-link">👑 Super Draw</a>'
                     . '<div class="ss-date-picker">'
                     . '  <input type="date" id="ss-date-picker" class="ss-date-input" max="' . htmlspecialchars(today_ist()) . '" />'
                     . '  <button id="ss-back-today" type="button" class="ss-btn-ghost-sm" style="display:none">Live today</button>'
                     . '</div>'
                     . '<a href="admin_login.php" class="ss-admin-link">🔒 Admin</a>';
        include __DIR__ . '/_hero.php';
      ?>

      <div id="ss-latest-card" class="ss-latest-card" style="display:none">
        <div class="ss-latest-side">
          <div class="ss-latest-label">✦ Latest Draw</div>
          <div class="ss-latest-time" id="ss-latest-time"></div>
        </div>
        <div class="ss-latest-nums">
          <div class="ss-latest-num col-a">
            <span class="ss-latest-num-label">A</span>
            <span class="ss-latest-num-value" id="ss-latest-a"></span>
          </div>
          <div class="ss-latest-num col-b">
            <span class="ss-latest-num-label">B</span>
            <span class="ss-latest-num-value" id="ss-latest-b"></span>
          </div>
          <div class="ss-latest-num col-c">
            <span class="ss-latest-num-label">C</span>
            <span class="ss-latest-num-value" id="ss-latest-c"></span>
          </div>
        </div>
      </div>

      <div class="ss-card">
        <div class="ss-table-wrap">
          <table class="ss-table">
            <thead>
              <tr>
                <th class="ss-col-time-h">Time</th>
                <th class="col-a-h">A</th>
                <th class="col-b-h">B</th>
                <th class="col-c-h">C</th>
              </tr>
            </thead>
            <tbody id="ss-tbody">
              <tr><td colspan="4" class="ss-empty">Loading board...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <footer class="ss-footer">
        <span id="ss-footer-text">Numbers reveal live as their IST time arrives · Board auto-refreshes every 15 seconds</span>
      </footer>
    </div>
  </div>

  <script src="assets/app.js"></script>
  <script>NPL1.initHome();</script>
</body>
</html>
