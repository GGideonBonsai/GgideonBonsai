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
    const item = await DB().Trash.restore(id);
    if (!item) return;
    const { type, data } = item;
    if (type === 'species')   await DB().Species.save(data);
    if (type === 'plant')     await DB().Plants.save(data);
    if (type === 'landscape') await DB().Landscapes.save(data);
    if (type === 'pot')       await DB().Pots.save(data);
    await DB().Trash.delete(id);
    renderTrash();
  },
  deleteFromTrash: async (id) => {
    if (!confirm('Удалить навсегда?')) return;
    await DB().Trash.delete(id);
    renderTrash();
  },
  clearTrash: async () => {
    if (!confirm('Очистить всю корзину?')) return;
    await DB().Trash.clear();
    renderTrash();
  },

  // Auth
  authSignInEmail: () => {
    const email = document.getElementById('auth-email')?.value;
    const pass  = document.getElementById('auth-pass')?.value;
    if (!email || !pass) return alert('Введите email и пароль');
    signInWithEmail(email, pass).catch(e => alert('Ошибка входа: ' + e.message));
  },
  authSignUp: () => {
    const email = document.getElementById('auth-email')?.value;
    const pass  = document.getElementById('auth-pass')?.value;
    if (!email || !pass) return alert('Введите email и пароль');
    signUpWithEmail(email, pass)
      .then(() => alert('Проверьте почту для подтверждения'))
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
  document.getElementById('user-email').textContent = user.email || '';
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
  el.innerHTML = `
    <div class="profile-section">
      <div class="profile-row">
        <span class="profile-label">Email</span>
        <span class="profile-value">${user?.email || '—'}</span>
      </div>
      <div class="profile-row" onclick="toggleDataBar()" style="cursor:pointer">
        <span class="profile-label">💾 Данные</span>
        <span class="profile-value">Резервная копия</span>
      </div>
      <div class="profile-row" onclick="requestNotifications()" style="cursor:pointer">
        <span class="profile-label">🔔 Уведомления</span>
        <span class="profile-value" id="notifStatus">Нажмите для включения</span>
      </div>
      <button class="btn btn-d" style="margin-top:16px" onclick="authSignOut()">Выйти из аккаунта</button>
    </div>`;
}

window.toggleDataBar = function() {
  document.getElementById('dataBar').classList.toggle('open');
};

window.requestNotifications = async function() {
  if (!('Notification' in window)) return alert('Уведомления не поддерживаются');
  const p = await Notification.requestPermission();
  document.getElementById('notifStatus').textContent = p === 'granted' ? '✅ Включены' : '❌ Отключены';
};

// ── Service Worker ────────────────────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

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
