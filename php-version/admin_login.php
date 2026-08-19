<?php
require_once __DIR__ . '/config.php';
bootstrap();

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = strtolower(trim($_POST['email'] ?? ''));
    $pw    = $_POST['password'] ?? '';
    $stmt = db()->prepare('SELECT password_hash FROM admins WHERE email = ?');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    if ($row && password_verify($pw, $row['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['admin_email'] = $email;
        header('Location: admin.php');
        exit;
    }
    $error = 'Invalid credentials';
}
if (is_admin()) { header('Location: admin.php'); exit; }
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NPL1 · Admin Sign In</title>
  <link rel="stylesheet" href="<?= asset('assets/style.css') ?>" />
</head>
<body>
  <div class="ss-page ss-login-page">
    <div class="ss-login-card">
      <a href="index.php" class="ss-back-link">← Back to board</a>
      <div class="ss-login-icon">🔒</div>
      <h2 class="ss-login-title">Admin Sign In</h2>
      <p class="ss-login-sub">Curate today's numbers</p>

      <?php if ($error): ?>
        <div class="ss-error-banner"><?= htmlspecialchars($error) ?></div>
      <?php endif; ?>

      <form method="POST" class="ss-login-form">
        <div>
          <label for="email">Email</label>
          <input id="email" class="ss-input" name="email" type="email" required autofocus placeholder="admin@shivshakti.local" />
        </div>
        <div>
          <label for="password">Password</label>
          <input id="password" class="ss-input" name="password" type="password" required placeholder="••••••••" />
        </div>
        <button type="submit" class="ss-btn-primary">Sign In</button>
      </form>
    </div>
  </div>
</body>
</html>
