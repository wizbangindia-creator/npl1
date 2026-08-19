// ==========================================================
//  NPL1 — Admin panel JS (upcoming-slot changer + hold/release)
// ==========================================================
(function () {
  const state = { slotKey: null, dirty: false, super: null };

  const clockEl   = document.querySelector('#admin-clock');
  const timeEl    = document.querySelector('#upcoming-time');
  const statusEl  = document.querySelector('#upcoming-status');
  const inputsEl  = document.querySelector('#upcoming-inputs');
  const actionsEl = document.querySelector('#upcoming-actions');
  const emptyEl   = document.querySelector('#upcoming-empty');
  const aEl = document.querySelector('#up-a');
  const bEl = document.querySelector('#up-b');
  const cEl = document.querySelector('#up-c');
  const saveBtn    = document.querySelector('#up-save');
  const holdBtn    = document.querySelector('#up-hold');
  const releaseBtn = document.querySelector('#up-release');

  const superEditor = document.querySelector('#super-editor');
  const superInput  = document.querySelector('#super-input');
  const superSave   = document.querySelector('#super-save');
  const superHint   = document.querySelector('#super-hint');
  const superDate   = document.querySelector('#super-date');

  const pwdForm    = document.querySelector('#password-form');
  const pwdCurrent = document.querySelector('#pwd-current');
  const pwdNew     = document.querySelector('#pwd-new');
  const pwdConfirm = document.querySelector('#pwd-confirm');
  const pwdSubmit  = document.querySelector('#pwd-submit');

  let current = null; // last upcoming payload

  [aEl, bEl, cEl].forEach((inp) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 2);
      state.dirty = true;
    });
  });

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then((r) => r.json().then((j) => ({ ok: r.ok, j })));
  }

  function loadUpcoming() {
    NPL1.fetchJson('api/admin_upcoming.php')
      .then((d) => { current = d; renderUpcoming(d); })
      .catch((e) => {
        if (String(e.message).toLowerCase().includes('not authenticated')) {
          window.location.href = 'admin_login.php';
        }
      });
  }

  function renderUpcoming(d) {
    clockEl.textContent = d.current_time_ist || '--:--:--';
    const slot = d.slot;

    if (!slot) {
      timeEl.textContent = '— no more draws today —';
      inputsEl.style.display = 'none';
      actionsEl.style.display = 'none';
      statusEl.textContent = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    inputsEl.style.display = 'flex';
    actionsEl.style.display = 'flex';
    timeEl.textContent = slot.time;

    const key = slot.hour + ':' + slot.minute;
    if (key !== state.slotKey) {
      state.slotKey = key;
      aEl.value = slot.a; bEl.value = slot.b; cEl.value = slot.c;
      state.dirty = false;
    } else if (!state.dirty) {
      aEl.value = slot.a; bEl.value = slot.b; cEl.value = slot.c;
    }

    const held = !!slot.held, released = !!slot.released;
    const timeReached = !!d.time_reached;
    const remaining = d.hold_remaining_seconds;

    // Toggle hold/release buttons
    if (!held || released) {
      holdBtn.style.display = 'inline-flex';
      releaseBtn.style.display = 'none';
    } else {
      holdBtn.style.display = 'none';
      releaseBtn.style.display = 'inline-flex';
      releaseBtn.textContent = '▶ Release' + (remaining != null ? ' (' + remaining + 's)' : '');
    }

    // Status text
    if (!timeReached && !held) statusEl.textContent = 'Not yet revealed · set numbers now';
    else if (!timeReached && held) statusEl.textContent = 'Armed to hold when reveal time arrives';
    else if (timeReached && held && !released && remaining != null) {
      statusEl.innerHTML = '<span class="ss-hold-live">Holding — auto-reveals in ' + remaining + 's</span>';
    } else statusEl.textContent = 'Revealing now';
  }

  saveBtn.addEventListener('click', () => {
    if (!current || !current.slot) return;
    const a = aEl.value, b = bEl.value, c = cEl.value;
    if (![a, b, c].every((v) => /^\d{2}$/.test(v))) {
      NPL1.toast('Each column needs a full 2-digit number (00-99)', 'error');
      return;
    }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
    post('api/update_slot.php', {
      date: current.date, hour: current.slot.hour, minute: current.slot.minute, a, b, c,
    }).then(({ ok, j }) => {
      if (!ok) throw new Error(j.error || 'Save failed');
      NPL1.toast('Saved ' + current.slot.time, 'success');
      state.dirty = false;
      loadUpcoming();
    }).catch((e) => NPL1.toast(e.message, 'error'))
      .finally(() => { saveBtn.disabled = false; saveBtn.textContent = '💾 Save'; });
  });

  holdBtn.addEventListener('click', () => {
    if (!current || !current.slot) return;
    holdBtn.disabled = true;
    post('api/hold_slot.php', {
      date: current.date, hour: current.slot.hour, minute: current.slot.minute,
    }).then(({ ok, j }) => {
      if (!ok) throw new Error(j.error || 'Hold failed');
      NPL1.toast('Result on hold — release within 60s or it auto-reveals', 'success');
      loadUpcoming();
    }).catch((e) => NPL1.toast(e.message, 'error'))
      .finally(() => { holdBtn.disabled = false; });
  });

  releaseBtn.addEventListener('click', () => {
    if (!current || !current.slot) return;
    releaseBtn.disabled = true;
    post('api/release_slot.php', {
      date: current.date, hour: current.slot.hour, minute: current.slot.minute,
    }).then(({ ok, j }) => {
      if (!ok) throw new Error(j.error || 'Release failed');
      NPL1.toast('Result released', 'success');
      loadUpcoming();
    }).catch((e) => NPL1.toast(e.message, 'error'))
      .finally(() => { releaseBtn.disabled = false; });
  });

  // ---------- Super draw ----------
  function loadSuper() {
    NPL1.fetchJson('api/admin_superdraw.php')
      .then((d) => {
        state.super = d;
        superEditor.style.display = 'block';
        superDate.textContent = d.date;
        if (document.activeElement !== superInput) superInput.value = d.number || '';
        superHint.textContent = d.revealed ? 'Live · publicly visible now' : ('Reveals at ' + d.reveal_time);
      })
      .catch((e) => {
        if (String(e.message).toLowerCase().includes('not authenticated')) {
          window.location.href = 'admin_login.php';
        }
      });
  }

  superInput.addEventListener('input', () => {
    superInput.value = superInput.value.replace(/\D/g, '').slice(0, 2);
  });

  superSave.addEventListener('click', () => {
    const v = superInput.value.replace(/\D/g, '').slice(0, 2);
    if (!/^\d{2}$/.test(v)) { NPL1.toast('Super draw must be a 2-digit number (00-99)', 'error'); return; }
    superSave.disabled = true;
    post('api/update_super.php', { date: state.super.date, number: v })
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || 'Save failed');
        NPL1.toast('Super draw saved', 'success');
        loadSuper();
      }).catch((e) => NPL1.toast(e.message, 'error'))
      .finally(() => { superSave.disabled = false; });
  });

  // ---------- Change password ----------
  pwdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pwdNew.value.length < 6) { NPL1.toast('New password must be at least 6 characters', 'error'); return; }
    if (pwdNew.value !== pwdConfirm.value) { NPL1.toast('New password and confirmation do not match', 'error'); return; }
    pwdSubmit.disabled = true; pwdSubmit.textContent = 'Updating...';
    post('api/change_password.php', { current_password: pwdCurrent.value, new_password: pwdNew.value })
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || 'Password change failed');
        NPL1.toast('Password changed successfully', 'success');
        pwdForm.reset();
      }).catch((e) => NPL1.toast(e.message, 'error'))
      .finally(() => { pwdSubmit.disabled = false; pwdSubmit.textContent = '🛡 Update Password'; });
  });

  // ---------- Boot ----------
  loadUpcoming();
  loadSuper();
  setInterval(loadUpcoming, 1000);
  setInterval(loadSuper, 5000);
})();
