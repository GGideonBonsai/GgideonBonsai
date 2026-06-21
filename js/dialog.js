// dialog.js — Custom dialog system (confirm / alert / prompt)
// Единственный файл без зависимостей — загружается первым через <script type="module">

function _openDialog(id, opts) {
  ['mo-confirm', 'mo-alert'].forEach(did => {
    const d = document.getElementById(did);
    if (d) d.style.display = 'none';
  });
  window._dialogCallback = null;

  const modal = document.getElementById(id);
  if (!modal) return;

  const isConfirm = id === 'mo-confirm';
  const iconEl  = document.getElementById(isConfirm ? 'confirm-icon'  : 'alert-icon');
  const titleEl = document.getElementById(isConfirm ? 'confirm-title' : 'alert-title');
  const msgEl   = document.getElementById(isConfirm ? 'confirm-msg'   : 'alert-msg');

  if (iconEl)  iconEl.textContent  = opts.icon  || (isConfirm ? '⚠️' : 'ℹ️');
  if (titleEl) titleEl.textContent = opts.title || '';
  if (msgEl)   msgEl.textContent   = opts.msg   || '';

  if (isConfirm) {
    const btn = document.getElementById('confirm-yes-btn');
    if (btn) {
      btn.textContent = opts.yesText  || 'Да';
      btn.style.color = opts.yesColor || '#8b3a3a';
    }
  }

  window._dialogCallback = opts.callback;
  modal.style.display = 'flex';

  const inner = modal.querySelector('div');
  if (inner) {
    inner.style.transform = 'scale(.9)';
    requestAnimationFrame(() =>
      requestAnimationFrame(() => { inner.style.transform = 'scale(1)'; })
    );
  }
}

function _closeDialog(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  const inner = modal.querySelector('div');
  if (inner) inner.style.transform = 'scale(.9)';
  setTimeout(() => { modal.style.display = 'none'; }, 150);
  window._dialogCallback = null;
}

// ── Кнопки в HTML вызывают эти функции через onclick ────────────────────────
window._dialogCallback = null;

window._confirmResolve = function(result) {
  const cb = window._dialogCallback;
  _closeDialog('mo-confirm');
  if (cb) setTimeout(() => cb(result), 10);
};

window._alertResolve = function() {
  const cb = window._dialogCallback;
  _closeDialog('mo-alert');
  if (cb) setTimeout(() => cb(), 10);
};

// ── Публичное API ────────────────────────────────────────────────────────────
window.showConfirm = function(msg, title, icon, yesText, yesColor) {
  return new Promise(resolve => {
    _openDialog('mo-confirm', {
      msg:      msg      || '',
      title:    title    || 'Подтвердите',
      icon:     icon     || '⚠️',
      yesText:  yesText  || 'Да',
      yesColor: yesColor || '#8b3a3a',
      callback: resolve,
    });
  });
};

window.showAlert = function(msg, title, icon) {
  return new Promise(resolve => {
    _openDialog('mo-alert', {
      msg:      msg   || '',
      title:    title || '',
      icon:     icon  || 'ℹ️',
      callback: resolve,
    });
  });
};

window.showPrompt = function(label, placeholder = '') {
  return new Promise(resolve => {
    const existing = document.getElementById('mo-prompt');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'mo-prompt';
    div.className = 'overlay open';
    div.style.cssText = 'align-items:center;justify-content:center;padding:0 16px;z-index:999';
    div.innerHTML = `
      <div class="modal" style="border-radius:16px;max-width:320px;padding-bottom:0;transform:scale(1);max-height:none">
        <div style="padding:20px 16px 8px">
          <div style="font-size:13px;color:var(--stone);margin-bottom:8px">${label}</div>
          <input class="fi" id="prompt-input" placeholder="${placeholder}" style="font-size:15px" autofocus>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--ash);margin-top:12px">
          <button onclick="document.getElementById('mo-prompt').remove();window._promptResolve(null)"
            style="padding:14px;background:none;border:none;border-right:1px solid var(--ash);font-size:15px;color:var(--stone);cursor:pointer">Отмена</button>
          <button onclick="const v=document.getElementById('prompt-input').value.trim();document.getElementById('mo-prompt').remove();window._promptResolve(v||null)"
            style="padding:14px;background:none;border:none;font-size:15px;font-weight:600;color:var(--moss);cursor:pointer">OK</button>
        </div>
      </div>`;

    document.body.appendChild(div);
    window._promptResolve = resolve;
    setTimeout(() => div.querySelector('#prompt-input')?.focus(), 100);
  });
};

// ── Emergency reset (3 тапа по заголовку) ───────────────────────────────────
let _tapCount = 0, _tapTimer = null;
window.emergencyReset = function() {
  _tapCount++;
  clearTimeout(_tapTimer);
  _tapTimer = setTimeout(() => { _tapCount = 0; }, 1000);
  if (_tapCount < 3) return;
  _tapCount = 0;

  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('open'));
  _closeDialog('mo-confirm');
  _closeDialog('mo-alert');
  document.getElementById('mo-prompt')?.remove();
  console.log('Emergency reset done');
};
