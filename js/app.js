// app.js — Main entry point for Gideon Bonsai (Supabase version)
import {
  initSupabase, getUser, onAuthChange,
  signInWithEmail, signUpWithEmail, signOut,
  SBSpecies, SBPlants, SBLandscapes, SBPots, SBTasks, SBPhotos, SBRegularActions, SBTrash, getSB
} from './supabase.js';

import {
  openModal, closeModal, closeTop, openSpeciesList, openPlantDetail, switchItab,
  selChip, togChip,
  saveAddSpecies, saveEditSpecies, deleteSpecies, handleSpeciesPhotoFile,
  editPhotoMeta, savePhotoMeta,
  saveAddPlant, saveEditPlant, deletePlant, clonePlant,
  savePhoto, setMainPhoto, deletePhoto, handlePhotoFile,
  saveHistory, deleteHistory,
  saveAddTask, completeTask,
  saveAddRegularAction, editRegularAction, saveEditRegularAction, deleteRegularAction, completeRegularAction,
  saveAddLs, saveEditLs, deleteLs, addLocation,
  saveAddPot, saveEditPot, deletePot,
  goToLandscape, goToPot
} from './modals.js';

import {
  renderSpecies, renderLandscapes, renderPots, renderDeals,
  updateBadge, toggleLs, switchHistSubtab,
  renderStats, renderTrash, renderLocationPlants
} from './render.js';

// ── Click Logger ─────────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const el = e.target;
  const info = {
    tag: el.tagName,
    id: el.id || null,
    class: el.className?.toString?.().substring(0,40) || null,
    text: el.textContent?.trim?.().substring(0,30) || null,
    onclick: el.getAttribute?.('onclick')?.substring(0,60) || null,
  };
  console.log('🖱️ CLICK:', JSON.stringify(info));
}, true);

// Track all async errors
window.addEventListener('unhandledrejection', e => {
  console.error('💥 UNHANDLED:', e.reason);
});

// ── DB global ─────────────────────────────────────────────────────────────────
window.DB = {
  Species:        SBSpecies,
  Plants:         SBPlants,
  Landscapes:     SBLandscapes,
  Pots:           SBPots,
  Tasks:          SBTasks,
  Photos:         SBPhotos,
  RegularActions: SBRegularActions,
  Trash:          SBTrash,
};
window._sbClient = getSB;

// ── Custom dialogs ────────────────────────────────────────────────────────────
window._confirmResolve = null;
window._alertResolve = null;

window.showConfirm = function(msg, title='Подтвердите', icon='⚠️', yesText='Да', yesColor='var(--danger)') {
  return new Promise(resolve => {
    document.getElementById('confirm-icon').textContent = icon;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    const yesBtn = document.getElementById('confirm-yes-btn');
    yesBtn.textContent = yesText;
    yesBtn.style.color = yesColor;
    const modal = document.getElementById('mo-confirm');
    modal.classList.add('open');
    modal.querySelector('.modal').style.transform = 'scale(1)';
    window._confirmResolve = (result) => {
      modal.classList.remove('open');
      modal.querySelector('.modal').style.transform = 'scale(.9)';
      resolve(result);
    };
  });
};

window.showPrompt = function(label, placeholder='') {
  return new Promise(resolve => {
    // Use a simple inline input modal
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
          <button onclick="document.getElementById('mo-prompt').remove();window._promptResolve(null)" style="padding:14px;background:none;border:none;border-right:1px solid var(--ash);font-size:15px;color:var(--stone);cursor:pointer">Отмена</button>
          <button onclick="const v=document.getElementById('prompt-input').value.trim();document.getElementById('mo-prompt').remove();window._promptResolve(v||null)" style="padding:14px;background:none;border:none;font-size:15px;font-weight:600;color:var(--moss);cursor:pointer">OK</button>
        </div>
      </div>`;
    document.body.appendChild(div);
    window._promptResolve = resolve;
    setTimeout(() => div.querySelector('#prompt-input')?.focus(), 100);
  });
};

window.showAlert = function(msg, title='', icon='ℹ️') {
  return new Promise(resolve => {
    document.getElementById('alert-icon').textContent = icon;
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-msg').textContent = msg;
    const modal = document.getElementById('mo-alert');
    modal.classList.add('open');
    modal.querySelector('.modal').style.transform = 'scale(1)';
    window._alertResolve = () => {
      modal.classList.remove('open');
      modal.querySelector('.modal').style.transform = 'scale(.9)';
      resolve();
    };
  });
};

// ── Navigation stack ──────────────────────────────────────────────────────────
const screenStack = [];

window.showScreen = function(id, title, renderFn) {
  const screen = document.getElementById(id);
  if (!screen) return;
  screenStack.push(id);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  screen.classList.add('on');
  if (renderFn) renderFn();
};

window.goBack = function() {
  if (screenStack.length <= 1) return false;
  screenStack.pop();
  const prev = screenStack[screenStack.length - 1];
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById(prev)?.classList.add('on');
  return true;
};

window.goHome = function() {
  screenStack.length = 0;
  screenStack.push('screen-home');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById('screen-home')?.classList.add('on');
  document.getElementById('fab')?.style && (document.getElementById('fab').style.display = 'none');
};

// ── Home navigation buttons ───────────────────────────────────────────────────
window.navTo = function(section) {
  switch(section) {
    case 'plants':
      showScreen('screen-plants', 'Растения', () => renderSpecies());
      document.getElementById('fab').style.display = 'flex';
      break;
    case 'landscapes':
      showScreen('screen-landscapes', 'Ландшафты', () => renderLandscapes());
      document.getElementById('fab').style.display = 'none';
      break;
    case 'pots':
      showScreen('screen-pots', 'Горшки', () => renderPots());
      document.getElementById('fab').style.display = 'none';
      break;
    case 'deals':
      showScreen('screen-deals', 'Дела', () => renderDeals());
      document.getElementById('fab').style.display = 'none';
      break;
    case 'stats':
      showScreen('screen-stats', 'Статистика', () => renderStats());
      document.getElementById('fab').style.display = 'none';
      break;
    case 'trash':
      showScreen('screen-trash', 'Корзина', () => renderTrash());
      document.getElementById('fab').style.display = 'none';
      break;
  }
};

// ── Expose globals ────────────────────────────────────────────────────────────
Object.assign(window, {
  openModal, closeModal, openSpeciesList, openPlantDetail, switchItab,
  selChip, togChip,
  saveAddSpecies, saveEditSpecies, deleteSpecies, handleSpeciesPhotoFile,
  editPhotoMeta, savePhotoMeta,
  saveAddPlant, saveEditPlant, deletePlant, clonePlant,
  savePhoto, setMainPhoto, deletePhoto, handlePhotoFile,
  saveHistory, deleteHistory,
  saveAddTask, completeTask,
  saveAddRegularAction, editRegularAction, saveEditRegularAction, deleteRegularAction, completeRegularAction,
  saveAddLs, saveEditLs, deleteLs, addLocation,
  saveAddPot, saveEditPot, deletePot,
  goToLandscape, goToPot, toggleLs, switchHistSubtab, renderLocationPlants,

  openAddPhoto: (plantId) => openModal('mo-photo', plantId),
  setSpeciesSort: (v) => window.setSpeciesSort(v),
  setMainPhotoUI: (plantId, photoId) => setMainPhoto(plantId, photoId),
  deletePhotoUI: (plantId, photoId) => deletePhoto(plantId, photoId),
  viewPhoto: (url) => {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px';
    ov.appendChild(img);
    ov.onclick = () => document.body.removeChild(ov);
    document.body.appendChild(ov);
  },

  // Trash
  restoreFromTrash: async (id) => {
    const db = window.DB;
    const item = await db.Trash.restore(id);
    if (!item) return;
    const { type, data } = item;

    if (type === 'species') {
      // Restore species
      await db.Species.save(data);
      // Also restore all plants that belonged to this species (from trash)
      const allTrash = await db.Trash.all();
      const plantItems = allTrash.filter(t => t.type === 'plant' && t.data?.species_id === data.id);
      for (const pi of plantItems) {
        await db.Plants.save(pi.data);
        await db.Trash.delete(pi.id);
      }
      if (plantItems.length > 0) {
        window.showAlert(`Восстановлен вид и ${plantItems.length} растений`, 'Восстановлено', '✅');
      }
    } else if (type === 'plant') {
      await db.Plants.save(data);
    } else if (type === 'landscape') {
      await db.Landscapes.save(data);
    } else if (type === 'pot') {
      await db.Pots.save(data);
    }

    await db.Trash.delete(id);
    await renderTrash();
  },
  deleteFromTrash: async (id) => {
    if (!await window.showConfirm('Удалить навсегда?','Подтвердите','⚠️','Да')) return;
    await window.DB.Trash.delete(id);
    renderTrash();
  },
  clearTrash: async () => {
    if (!await window.showConfirm('Очистить всю корзину?','Подтвердите','⚠️','Да')) return;
    await window.DB.Trash.clear();
    renderTrash();
  },

  // Auth (только email)
  authSignInEmail: () => {
    const email = document.getElementById('auth-email')?.value;
    const pass  = document.getElementById('auth-pass')?.value;
    if (!email || !pass) return window.showAlert('Введите email и пароль','Ошибка','❌');
    signInWithEmail(email, pass).catch(e => window.showAlert('Ошибка входа: ' + e.message, 'Ошибка', '❌'));
  },
  authSignUp: () => {
    const email = document.getElementById('auth-email')?.value;
    const pass  = document.getElementById('auth-pass')?.value;
    if (!email || !pass) return window.showAlert('Введите email и пароль','Ошибка','❌');
    signUpWithEmail(email, pass)
      .then(() => window.showAlert('Проверьте вашу почту для подтверждения регистрации','Регистрация','✅'))
      .catch(e => window.showAlert('Ошибка регистрации: ' + e.message, 'Ошибка', '❌'));
  },
  authSignOut: () => { signOut(); showAuthScreen(); },
});

// ── Search ────────────────────────────────────────────────────────────────────
window.doSearch = function() {
  const val = document.getElementById('srchInput')?.value || '';
  const active = document.querySelector('.screen.on')?.id;
  if (active === 'screen-plants')     renderSpecies(val);
  if (active === 'screen-landscapes') renderLandscapes(val);
  if (active === 'screen-pots')       renderPots(val);
  if (active === 'screen-deals')      renderDeals(val);
};

// ── Back navigation ───────────────────────────────────────────────────────────
let lastBackTime = 0;
window.addEventListener('popstate', () => {
  const now = Date.now();
  const activeId = screenStack[screenStack.length - 1];
  if (activeId === 'screen-home') {
    if (now - lastBackTime < 2000) {
      // Double back on home = exit (mobile)
      if (navigator.app?.exitApp) navigator.app.exitApp();
    } else {
      lastBackTime = now;
      // Show toast
      const t = document.createElement('div');
      t.textContent = 'Нажмите ещё раз для выхода';
      t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;z-index:999';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2000);
    }
  } else {
    goBack();
  }
  history.pushState(null, '', location.href);
});
history.pushState(null, '', location.href);

// Swipe right
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, {passive:true});
document.addEventListener('touchend', e => {
  if (e.changedTouches[0].clientX - touchStartX > 70 && touchStartX < 35) {
    const active = document.querySelector('.overlay.open');
    if (active) { closeTop(); return; }
    goBack();
  }
}, {passive:true});

document.addEventListener('change', e => {
  if (e.target.id === 'ap-style' || e.target.id === 'ep-style') {
    const wrap = e.target.id === 'ap-style' ? 'ap-style-other-wrap' : 'ep-style-other-wrap';
    document.getElementById(wrap).style.display = e.target.value === 'Другой' ? '' : 'none';
  }
});

// ── Auth UI ───────────────────────────────────────────────────────────────────
function showAuthScreen() {
  document.getElementById('app-auth').style.display = 'flex';
  document.getElementById('app-main').style.display = 'none';
}

function showAppScreen(user) {
  document.getElementById('app-auth').style.display = 'none';
  document.getElementById('app-main').style.display = 'block';
  const emailEl = document.getElementById('user-email');
  if (emailEl) emailEl.textContent = user.email || '';
  goHome();
}

// ── Bottom nav ────────────────────────────────────────────────────────────────
window.bottomNav = function(tab) {
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById(`bnav-${tab}`)?.classList.add('on');
  if (tab === 'home') goHome();
  if (tab === 'profile') showScreen('screen-profile', 'Профиль', renderProfile);
};

function renderProfile() {
  const user = window._currentUser;
  const profileEl = document.getElementById('screen-profile-content');
  if (!profileEl) return;
  const savedTime = localStorage.getItem('notif_time') || '09:00';
  const granted = Notification.permission === 'granted';
  profileEl.innerHTML = `
    <div class="profile-section">
      <div class="profile-row">
        <span class="profile-label">👤 Email</span>
        <span class="profile-value">${user?.email || '—'}</span>
      </div>

      <div style="background:var(--white);border-radius:14px;border:1px solid var(--ash);overflow:hidden;margin-bottom:10px">
        <div style="padding:14px;border-bottom:1px solid var(--ash);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:500">🔔 Уведомления</div>
            <div style="font-size:11px;color:var(--stone);margin-top:2px">${granted ? '✅ Включены' : '❌ Выключены'}</div>
          </div>
          ${granted
            ? `<button onclick="disableNotifications()" style="background:none;border:1px solid var(--danger);color:var(--danger);border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer">Отключить</button>`
            : `<button onclick="requestNotifications()" style="background:var(--moss);border:none;color:#fff;border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer">Включить</button>`
          }
        </div>
        <div style="padding:14px">
          <div style="font-size:11px;color:var(--stone);margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">Время напоминания</div>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="time" id="notif-time-input" value="${savedTime}" class="fi" style="flex:1;font-size:18px;font-family:monospace;text-align:center">
            <button onclick="saveNotifTime()" class="btn btn-p" style="width:auto;padding:10px 18px;font-size:13px;border-radius:10px">💾</button>
          </div>
          <div style="font-size:11px;color:var(--stone);margin-top:6px;line-height:1.4">Ежедневное напоминание о делах в выбранное время</div>
        </div>
      </div>

      <button class="btn btn-d" onclick="authSignOut()">🚪 Выйти из аккаунта</button>
    </div>`;
}

window.toggleDataBar = function() {
  document.getElementById('dataBar').classList.toggle('open');
};

window.requestNotifications = async function() {
  if (!('Notification' in window)) return window.showAlert('Ваш браузер не поддерживает уведомления','Недоступно','ℹ️');
  const p = await Notification.requestPermission();
  document.getElementById('notifStatus').textContent = p === 'granted' ? '✅ Включены' : '❌ Отключены';
};

// ── Service Worker ────────────────────────────────────────────────────────────
// ── Emergency unlock ─────────────────────────────────────────────────────────
// If app becomes unclickable, tap header 3 times to reset
let _tapCount = 0, _tapTimer = null;
window.emergencyReset = function() {
  _tapCount++;
  clearTimeout(_tapTimer);
  _tapTimer = setTimeout(() => { _tapCount = 0; }, 1000);
  if (_tapCount >= 3) {
    _tapCount = 0;
    // Close ALL overlays
    document.querySelectorAll('.overlay').forEach(o => {
      o.classList.remove('open');
    });
    // Reset confirm/alert state
    if (window._confirmResolve) { window._confirmResolve(false); }
    if (window._alertResolve) { window._alertResolve(); }
    // Remove any stray prompt modals
    document.getElementById('mo-prompt')?.remove();
    console.log('Emergency reset done');
  }
};

// Also add global click tracker to detect stuck state
document.addEventListener('click', (e) => {
  // If click hits an overlay backdrop (not modal content), close it
  if (e.target.classList.contains('overlay') && e.target.classList.contains('open')) {
    const modalId = e.target.id;
    // Don't auto-close confirm/alert by backdrop click - they need button
    if (modalId !== 'mo-confirm' && modalId !== 'mo-alert') {
      e.target.classList.remove('open');
    }
  }
}, true);

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/GgideonBonsai/sw.js')
      .then(reg => {
        window._swReg = reg;
        // Schedule notifications after SW ready
        scheduleNotifications();
      })
      .catch(() => {});
  }
}

// ── Notification scheduling ───────────────────────────────────────────────────
window.scheduleNotifications = async function() {
  if (Notification.permission !== 'granted') return;
  if (!window._swReg?.active) return;

  const time = localStorage.getItem('notif_time') || '09:00';
  const [h, m] = time.split(':').map(Number);

  // Get pending tasks and RAs
  const db = window.DB;
  if (!db) return;
  const [tasks, ras] = await Promise.all([db.Tasks.pending(), db.RegularActions.pending()]);

  // Calculate next notification time
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // Tomorrow if already passed

  const msUntil = next - now;
  const totalItems = tasks.length + ras.length;

  if (totalItems === 0) return;

  // Schedule via SW
  if (window._swReg?.active) {
    window._swReg.active.postMessage({
      type: 'SCHEDULE_ALARM',
      id: 'daily_reminder',
      title: '🌿 Gideon Bonsai',
      body: `У вас ${totalItems} ${totalItems === 1 ? 'дело' : 'дел'} ожидает выполнения`,
      timestamp: next.getTime()
    });
  }
};

window.saveNotifTime = function() {
  const time = document.getElementById('notif-time-input')?.value;
  if (!time) return;
  localStorage.setItem('notif_time', time);
  window.showAlert(`Уведомления настроены на ${time}`, 'Сохранено', '✅');
  scheduleNotifications();
};

// ── Care Code Decoder ────────────────────────────────────────────────────────
window.openCareDecoder = function(code) {
  if (!code) return;
  document.getElementById('care-decode-code').textContent = code;

  const parts = code.split('.');
  const items = [];

  const LIGHT = { D:'Яркий прямой свет, солнце', E:'Яркий рассеянный, возможно утреннее солнце', S:'Умеренный рассеянный', H:'Тень или глубокая тень' };
  const SEASON = { EV:'Вечнозелёное', DE:'Листопадное', SE:'Полулистопадное' };

  for (const part of parts) {
    if (!part) continue;
    // Season
    if (/^(EV|DE|SE)$/.test(part)) {
      items.push({ icon:'🍃', title:'Листопадность', val: SEASON[part] || part });
    }
    // Light: starts with D,E,S,H optionally followed by letter
    else if (/^[DESH]/.test(part) && part.length <= 3) {
      const lightKey = part[0];
      items.push({ icon:'☀️', title:'Освещение', val: LIGHT[lightKey] || part });
    }
    // Temperature: T3-5, T18-35 etc
    else if (/^T[\d]/.test(part)) {
      const range = part.slice(1);
      items.push({ icon:'🌡️', title:'Температура', val: `${range} — оптимальный диапазон °C` });
    }
    // Winter/cold: Z1-3
    else if (/^Z[\d]/.test(part)) {
      const zone = part.slice(1);
      const zones = { '1':'Холодная зимовка 0–5°C', '2':'Прохладная 5–10°C', '3':'Умеренная 10–15°C', '4':'Тёплая 15–20°C', '5':'Комнатная 18–25°C' };
      const zoneNum = zone.split('-')[0];
      items.push({ icon:'❄️', title:'Зимовка', val: zones[zoneNum] || `Зона ${zone}` });
    }
    // Watering: W2-3
    else if (/^W[\d]/.test(part)) {
      const lvl = part.slice(1);
      const vals = { '1':'Редкий полив, просушка между поливами', '2':'Умеренный, между просыханием верхнего слоя', '3':'Регулярный, почва слегка влажная', '4':'Обильный, почва постоянно умеренно влажная', '5':'Очень обильный' };
      const lvlNum = lvl.split('-')[0];
      items.push({ icon:'💧', title:'Полив', val: vals[lvlNum] || `Уровень ${lvl}` });
    }
    // Humidity: L4-5
    else if (/^L[\d]/.test(part)) {
      const lvl = part.slice(1);
      const vals = { '1':'Низкая', '2':'Умеренная', '3':'Средняя 50–60%', '4':'Повышенная 60–70%', '5':'Высокая 70–80%, опрыскивание' };
      const lvlNum = lvl.split('-')[0];
      items.push({ icon:'🌫️', title:'Влажность воздуха', val: vals[lvlNum] || `Уровень ${lvl}` });
    }
    // Feeding: S234
    else if (/^S[\d]/.test(part)) {
      const months = part.slice(1);
      const monthNames = { '1':'янв','2':'фев','3':'мар','4':'апр','5':'май','6':'июн','7':'июл','8':'авг','9':'сен','10':'окт','11':'ноя','12':'дек' };
      const mList = months.split('').map(m => monthNames[m] || m).join(', ');
      items.push({ icon:'🌿', title:'Подкормки', val: `Месяцы: ${mList}` });
    }
    // Pruning: P2-3
    else if (/^P[\d]/.test(part)) {
      const cnt = part.slice(1);
      items.push({ icon:'✂️', title:'Обрезка', val: `${cnt} раз в сезон — формирующая обрезка` });
    }
    // Repotting: R2, R3a, R4a
    else if (/^R[\d]/.test(part)) {
      const freq = part.slice(1);
      const freqMap = { '1':'Ежегодно', '2':'Раз в 2–3 года', '3':'Раз в 3 года', '4':'Раз в 3–5 лет', '5':'Редко, раз в 5+ лет' };
      const freqNum = freq.replace(/[a-z]/g,'');
      const spring = part.includes('a') ? ', ранней весной' : '';
      items.push({ icon:'🪴', title:'Пересадка', val: (freqMap[freqNum] || `Раз в ${freqNum} года`) + spring });
    }
  }

  const list = document.getElementById('care-decode-list');
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-msg">Код не распознан</div>';
  } else {
    list.innerHTML = items.map(i => `
      <div class="care-decode-item">
        <div class="care-decode-icon">${i.icon}</div>
        <div>
          <div class="care-decode-title">${i.title}</div>
          <div class="care-decode-val">${i.val}</div>
        </div>
      </div>`).join('');
  }

  // Open as bottom sheet
  const modal = document.getElementById('mo-care-decode');
  modal.classList.add('open');
};

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await initSupabase();
  registerSW();

  onAuthChange(async (user) => {
    window._currentUser = user;
    if (user) {
      showAppScreen(user);
      await updateBadge();
    } else {
      showAuthScreen();
    }
  });

  const user = await getUser();
  window._currentUser = user;
  if (user) {
    showAppScreen(user);
    await updateBadge();
  } else {
    showAuthScreen();
  }
}

init();
