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
    if (type === 'species')   await db.Species.save(data);
    if (type === 'plant')     await db.Plants.save(data);
    if (type === 'landscape') await db.Landscapes.save(data);
    if (type === 'pot')       await db.Pots.save(data);
    await db.Trash.delete(id);
    renderTrash();
  },
  deleteFromTrash: async (id) => {
    if (!confirm('Удалить навсегда?')) return;
    await window.DB.Trash.delete(id);
    renderTrash();
  },
  clearTrash: async () => {
    if (!confirm('Очистить всю корзину?')) return;
    await window.DB.Trash.clear();
    renderTrash();
  },

  // Auth (только email)
  authSignInEmail: () => {
    const email = document.getElementById('auth-email')?.value;
    const pass  = document.getElementById('auth-pass')?.value;
    if (!email || !pass) return window.showAlert('Введите email и пароль','Ошибка','❌');
    signInWithEmail(email, pass).catch(e => alert('Ошибка входа: ' + e.message));
  },
  authSignUp: () => {
    const email = document.getElementById('auth-email')?.value;
    const pass  = document.getElementById('auth-pass')?.value;
    if (!email || !pass) return window.showAlert('Введите email и пароль','Ошибка','❌');
    signUpWithEmail(email, pass)
      .then(() => window.showAlert('Проверьте вашу почту для подтверждения регистрации','Регистрация','✅'))
      .catch(e => alert('Ошибка регистрации: ' + e.message));
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
  const el = document.getElementById('screen-profile-content');
  if (!el) return;
  const savedTime = localStorage.getItem('notif_time') || '09:00';
  const notifStatus = Notification.permission === 'granted' ? '✅ Включены' : '❌ Выключены';
  el.innerHTML = `
    <div class="profile-section">
      <div class="profile-row">
        <span class="profile-label">👤 Email</span>
        <span class="profile-value">${user?.email || '—'}</span>
      </div>

      <div style="background:#fff;border-radius:12px;border:1px solid var(--ash);overflow:hidden;margin-bottom:8px">
        <div style="padding:12px 14px;border-bottom:1px solid var(--ash)">
          <div style="font-size:13px;font-weight:500;margin-bottom:4px">🔔 Уведомления</div>
          <div style="font-size:11px;color:var(--stone)">${notifStatus}</div>
        </div>
        <div style="padding:12px 14px;border-bottom:1px solid var(--ash)">
          <div style="font-size:12px;color:var(--stone);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Время уведомлений</div>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="time" id="notif-time-input" value="${savedTime}" class="fi" style="flex:1;font-size:16px;font-family:monospace">
            <button onclick="saveNotifTime()" class="btn btn-p" style="width:auto;padding:8px 16px;font-size:13px">Сохранить</button>
          </div>
          <div style="font-size:11px;color:var(--stone);margin-top:6px">Ежедневное напоминание о запланированных делах</div>
        </div>
        <div style="padding:12px 14px" onclick="requestNotifications()" style="cursor:pointer">
          <button class="btn btn-s" style="margin-top:0">Включить уведомления</button>
        </div>
      </div>

      <button class="btn btn-d" style="margin-top:8px" onclick="authSignOut()">🚪 Выйти из аккаунта</button>
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
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
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
