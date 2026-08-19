// ==========================================================
//  NPL1 (Shivshaktiloto) — vanilla JS for Home + Super Draw
// ==========================================================
(function () {
  const NPL1 = {};
  window.NPL1 = NPL1;

  // ---------- utils ----------
  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function todayIST() {
    // en-CA -> YYYY-MM-DD
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }
  function istClock() {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    });
  }
  function formatDateISO(iso) {
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return iso; }
  }
  function fetchJson(url) {
    return fetch(url, { credentials: 'same-origin' }).then((r) => {
      if (!r.ok) return r.json().then((j) => { throw new Error(j.error || r.statusText); });
      return r.json();
    });
  }

  // ---------- online-users pill (client-side pseudo count) ----------
  function seedOnline() {
    const t = new Date();
    const base = 320 + ((t.getHours() * 17 + t.getMinutes()) % 250);
    return Math.min(940, Math.max(180, base + Math.floor(Math.random() * 180)));
  }
  function startOnlineUsers() {
    const countEl = $('#online-count');
    if (!countEl) return;
    let count = seedOnline();
    countEl.textContent = count.toLocaleString();
    setInterval(() => {
      const delta = Math.floor(Math.random() * 17) - 8; // -8..+8
      count += delta;
      if (count < 180) count = 180 + Math.floor(Math.random() * 25);
      if (count > 940) count = 940 - Math.floor(Math.random() * 25);
      countEl.textContent = count.toLocaleString();
    }, 3200);
  }

  // ---------- HOME (main board) ----------
  NPL1.initHome = function () {
    startOnlineUsers();

    const state = { selectedDate: '' }; // '' = today
    const tbody     = $('#ss-tbody');
    const dateSpan  = $('#ss-date');
    const clockSpan = $('#ss-clock');
    const progSpan  = $('#ss-progress');
    const latestCard = $('#ss-latest-card');
    const picker    = $('#ss-date-picker');
    const backBtn   = $('#ss-back-today');
    const footer    = $('#ss-footer-text');

    // date picker init
    picker.max = todayIST();
    picker.addEventListener('change', () => {
      state.selectedDate = picker.value;
      backBtn.style.display = picker.value ? 'inline-flex' : 'none';
      fetchNow();
    });
    backBtn.addEventListener('click', () => {
      picker.value = '';
      state.selectedDate = '';
      backBtn.style.display = 'none';
      fetchNow();
    });

    function render(data) {
      dateSpan.textContent = formatDateISO(data.date);
      const revealed = data.slots.filter((s) => s.revealed).length;
      progSpan.textContent = revealed + '/' + data.slots.length + ' revealed';

      // Latest draw card
      const li = data.latest_slot_index;
      if (li >= 0 && data.is_today) {
        const s = data.slots[li];
        latestCard.style.display = 'grid';
        $('#ss-latest-time').textContent = s.time;
        $('#ss-latest-a').textContent = s.a;
        $('#ss-latest-b').textContent = s.b;
        $('#ss-latest-c').textContent = s.c;
      } else {
        latestCard.style.display = 'none';
      }

      // Table
      tbody.innerHTML = '';
      data.slots.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.className = (s.revealed ? 'row-revealed' : 'row-pending') +
                       (i === li && data.is_today ? ' row-latest' : '');
        const td0 = el('td', 'ss-col-time', s.time);
        const td1 = el('td', 'ss-num col-a', s.revealed ? s.a : '—');
        const td2 = el('td', 'ss-num col-b', s.revealed ? s.b : '—');
        const td3 = el('td', 'ss-num col-c', s.revealed ? s.c : '—');
        tr.append(td0, td1, td2, td3);
        tbody.append(tr);
      });

      footer.textContent = state.selectedDate
        ? 'Viewing archived board for ' + formatDateISO(data.date)
        : 'Numbers reveal live as their IST time arrives · Board auto-refreshes every 15 seconds';
    }

    function fetchNow() {
      const url = state.selectedDate
        ? 'api/board_date.php?date=' + encodeURIComponent(state.selectedDate)
        : 'api/board_today.php';
      fetchJson(url).then(render).catch((e) => {
        tbody.innerHTML = '<tr><td colspan="4" class="ss-empty">' + e.message + '</td></tr>';
        latestCard.style.display = 'none';
      });
    }

    // Boot
    fetchNow();
    setInterval(() => { if (!state.selectedDate) fetchNow(); }, 15000);
    // Live clock
    clockSpan.textContent = istClock();
    setInterval(() => { clockSpan.textContent = istClock(); }, 1000);
  };

  // ---------- SUPER DRAW ----------
  NPL1.initSuperDraw = function () {
    startOnlineUsers();

    const state = { selectedDate: '' };
    const dateSpan = $('#sd-date');
    const clockSpan = $('#sd-clock');
    const revealEl = $('#sd-reveal-time');
    const numEl = $('#sd-number');
    const lockedHint = $('#sd-locked-hint');
    const dateInfo = $('#sd-date-info');
    const picker = $('#sd-date-picker');
    const backBtn = $('#sd-back-today');
    const footer = $('#sd-footer-text');

    picker.max = todayIST();
    picker.addEventListener('change', () => {
      state.selectedDate = picker.value;
      backBtn.style.display = picker.value ? 'inline-flex' : 'none';
      fetchNow();
    });
    backBtn.addEventListener('click', () => {
      picker.value = '';
      state.selectedDate = '';
      backBtn.style.display = 'none';
      fetchNow();
    });

    function render(data) {
      dateSpan.textContent = formatDateISO(data.date);
      revealEl.textContent = data.reveal_time;
      if (data.revealed) {
        numEl.textContent = data.number;
        numEl.classList.remove('locked');
        lockedHint.style.display = 'none';
      } else {
        numEl.textContent = '??';
        numEl.classList.add('locked');
        lockedHint.style.display = 'block';
        lockedHint.textContent = 'Unlocks today at ' + data.reveal_time + ' IST';
      }
      dateInfo.textContent = formatDateISO(data.date) + ' · ' + data.reveal_time;
      footer.textContent = state.selectedDate
        ? 'Viewing archived super draw for ' + formatDateISO(data.date)
        : 'One number per day · Auto-updates every 15 seconds';
    }

    function fetchNow() {
      const url = state.selectedDate
        ? 'api/superdraw_date.php?date=' + encodeURIComponent(state.selectedDate)
        : 'api/superdraw_today.php';
      fetchJson(url).then(render).catch((e) => {
        numEl.textContent = '—';
        numEl.classList.add('locked');
        lockedHint.style.display = 'block';
        lockedHint.textContent = e.message;
      });
    }

    fetchNow();
    setInterval(() => { if (!state.selectedDate) fetchNow(); }, 15000);
    clockSpan.textContent = istClock();
    setInterval(() => { clockSpan.textContent = istClock(); }, 1000);
  };

  // Expose helpers for admin.js
  NPL1.formatDateISO = formatDateISO;
  NPL1.todayIST = todayIST;
  NPL1.fetchJson = fetchJson;

  NPL1.toast = function (msg, kind) {
    const wrap = $('#toast-container') || (function () {
      const w = document.createElement('div');
      w.id = 'toast-container'; w.className = 'toast-container';
      document.body.append(w); return w;
    })();
    const t = document.createElement('div');
    t.className = 'toast ' + (kind === 'error' ? 'error' : 'success');
    t.textContent = msg;
    wrap.append(t);
    setTimeout(() => t.remove(), 3500);
  };
})();
