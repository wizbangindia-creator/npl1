// ==========================================================
//  NPL1 — Admin panel JS
// ==========================================================
(function () {
  const state = { selectedDate: NPL1.todayIST(), data: null, super: null };
  const tbody = document.querySelector('#admin-tbody');
  const picker = document.querySelector('#admin-date-picker');
  const reloadBtn = document.querySelector('#admin-reload');
  const regenBtn = document.querySelector('#regenerate-btn');
  const superEditor = document.querySelector('#super-editor');
  const superInput  = document.querySelector('#super-input');
  const superSave   = document.querySelector('#super-save');
  const superHint   = document.querySelector('#super-hint');
  const superDate   = document.querySelector('#super-date');

  function loadBoard() {
    const date = state.selectedDate === NPL1.todayIST() ? '' : state.selectedDate;
    const url = 'api/admin_board.php' + (date ? '?date=' + encodeURIComponent(date) : '');
    NPL1.fetchJson(url)
      .then((d) => { state.data = d; renderBoard(); })
      .catch((e) => {
        if (String(e.message).toLowerCase().includes('not authenticated')) {
          window.location.href = 'admin_login.php';
        } else {
          NPL1.toast(e.message, 'error');
        }
      });
  }
  function loadSuper() {
    NPL1.fetchJson('api/admin_superdraw.php')
      .then((d) => {
        state.super = d;
        superEditor.style.display = 'block';
        superDate.textContent = d.date;
        superInput.value = d.number || '';
        superHint.textContent = d.revealed ? 'Live · publicly visible now' : ('Reveals at ' + d.reveal_time);
      })
      .catch((e) => {
        if (String(e.message).toLowerCase().includes('not authenticated')) {
          window.location.href = 'admin_login.php';
        }
      });
  }

  function renderBoard() {
    tbody.innerHTML = '';
    state.data.slots.forEach((s, i) => {
      const tr = document.createElement('tr');
      const tdT = document.createElement('td');
      tdT.className = 'ss-col-time';
      tdT.textContent = s.time;
      tr.append(tdT);

      ['a', 'b', 'c'].forEach((k) => {
        const td = document.createElement('td');
        const inp = document.createElement('input');
        inp.className = 'ss-admin-input col-' + k + '-input';
        inp.maxLength = 2;
        inp.value = s[k] || '';
        inp.addEventListener('input', () => {
          inp.value = inp.value.replace(/\D/g, '').slice(0, 2);
        });
        td.append(inp);
        tr.append(td);
      });

      const tdBtn = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ss-btn-primary';
      btn.textContent = 'Save';
      btn.addEventListener('click', () => saveRow(tr, s, btn));
      tdBtn.append(btn);
      tr.append(tdBtn);

      tbody.append(tr);
    });
  }

  function saveRow(tr, slot, btn) {
    const inputs = tr.querySelectorAll('input');
    const a = inputs[0].value, b = inputs[1].value, c = inputs[2].value;
    if (![a, b, c].every((v) => /^\d{2}$/.test(v))) {
      NPL1.toast('Each column needs a full 2-digit number (00-99)', 'error');
      return;
    }
    btn.disabled = true; btn.textContent = 'Saving...';
    fetch('api/update_slot.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: state.data.date, hour: slot.hour, minute: slot.minute, a, b, c }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || 'Save failed');
        NPL1.toast('Saved ' + slot.time, 'success');
      })
      .catch((e) => NPL1.toast(e.message, 'error'))
      .finally(() => { btn.disabled = false; btn.textContent = 'Save'; loadBoard(); });
  }

  superSave.addEventListener('click', () => {
    const v = superInput.value.replace(/\D/g, '').slice(0, 2);
    if (!/^\d{2}$/.test(v)) {
      NPL1.toast('Super draw must be a 2-digit number (00-99)', 'error'); return;
    }
    superSave.disabled = true;
    fetch('api/update_super.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: state.super.date, number: v }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || 'Save failed');
        NPL1.toast('Super draw saved', 'success');
        loadSuper();
      })
      .catch((e) => NPL1.toast(e.message, 'error'))
      .finally(() => { superSave.disabled = false; });
  });

  regenBtn.addEventListener('click', () => {
    if (!confirm('Regenerate ALL random numbers for today? Any manual edits will be lost.')) return;
    fetch('api/regenerate.php', { method: 'POST', credentials: 'same-origin' })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || 'Regenerate failed');
        NPL1.toast("Today's numbers regenerated", 'success');
        picker.value = NPL1.todayIST();
        state.selectedDate = NPL1.todayIST();
        loadBoard();
      })
      .catch((e) => NPL1.toast(e.message, 'error'));
  });

  picker.addEventListener('change', () => {
    state.selectedDate = picker.value || NPL1.todayIST();
    loadBoard();
  });
  reloadBtn.addEventListener('click', loadBoard);

  // Boot
  loadBoard();
  loadSuper();
})();
