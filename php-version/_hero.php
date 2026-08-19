<?php
// -------- Reusable colourful hero (marquee + gradient + online pill)
// $page_title:   what to render inside .ss-title (e.g. "NPL1")
// $tag:          optional tag text
// $sub_html:     HTML injected under the tag (date/clock/etc)
// $toolbar_html: HTML for the toolbar row (buttons, links, date picker)
if (!isset($page_title)) $page_title = 'NPL1';
if (!isset($tag))        $tag = '';
if (!isset($sub_html))   $sub_html = '';
if (!isset($toolbar_html)) $toolbar_html = '';
?>
<div class="hero-wrap">
  <div class="hero-marquee">
    <div class="hero-marquee-track">
      <?php
      $items = [
        'NPL1 · Live Daily Draws',
        'Main Board · 9:00 AM – 10:00 PM IST',
        'Super Draw at 11:30 AM Daily',
        '63 Live Draws Every Day',
        'Results Revealed Live',
        'Two Digits · A · B · C',
      ];
      // duplicate list so the loop scroll looks seamless
      foreach (array_merge($items, $items) as $it): ?>
        <span class="hero-marquee-item">◆ <?= htmlspecialchars($it) ?></span>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="hero">
    <div class="hero-blob b1"></div>
    <div class="hero-blob b2"></div>
    <div class="hero-blob b3"></div>
    <div class="hero-blob b4"></div>
    <span class="hero-star s1">&#10022;</span>
    <span class="hero-star s2">&#10023;</span>
    <span class="hero-star s3">&#10022;</span>
    <span class="hero-star s4">&#10023;</span>

    <div class="hero-inner">
      <h1 class="ss-title"><?= htmlspecialchars($page_title) ?></h1>
      <div class="ss-title-underline"></div>
      <?php if ($tag !== ''): ?>
        <div class="ss-tag"><?= $tag ?></div>
      <?php endif; ?>

      <div class="ss-online-row">
        <div class="online-pill" id="online-pill">
          <span class="online-dot"></span>
          <span class="online-count" id="online-count">—</span>
          <span class="online-label">watching now</span>
        </div>
      </div>

      <?php if ($sub_html !== ''): ?>
        <div class="ss-sub"><?= $sub_html ?></div>
      <?php endif; ?>

      <?php if ($toolbar_html !== ''): ?>
        <div class="ss-toolbar"><?= $toolbar_html ?></div>
      <?php endif; ?>
    </div>
  </div>
</div>
