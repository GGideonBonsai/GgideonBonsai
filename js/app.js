// app.js — Main entry point for Gideon Bonsai (Supabase version)
import {
  initSupabase, getUser, onAuthChange,
  signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
  SBSpecies, SBPlants, SBLandscapes, SBPots, SBTasks, SBPhotos
} from './supabase.js';

import {
  openModal, closeModal, closeTop, openSpeciesList, openPlantDetail, switchItab,
  selChip, togChip,
  saveAddSpecies, saveEditSpecies, deleteSpecies,
  saveAddPlant, saveEditPlant, deletePlant, clonePlant,
  savePhoto, setMainPhoto, deletePhoto, handlePhotoFile,
  saveHistory, deleteHistory,
  saveAddTask, completeTask,
  saveAddLs, saveEditLs, deleteLs, addLocation,
  saveAddPot, saveEditPot, deletePot,
  goToLandscape, goToPot
} from './modals.js';

import { renderSpecies, renderLandscapes, renderPots, renderDeals, updateBadge, toggleLs } from './render.js';

// ── Expose Supabase stores globally so modals.js can use them ─────────────────
window.DB = {
  Species:    SBSpecies,
  Plants:     SBPlants,
  Landscapes: SBLandscapes,
  Pots:       SBPots,
  Tasks:      SBTasks,
  Photos:     SBPhotos,
};

// ── Expose globals for inline onclick handlers ────────────────────────────────
Object.assign(window, {
  openModal, closeModal, openSpeciesList, openPlantDetail, switchItab,
  selChip, togChip,
  saveAddSpecies, saveEditSpecies, deleteSpecies,
  saveAddPlant, saveEditPlant, deletePlant, clonePlant,
  savePhoto, setMainPhoto, deletePhoto, handlePhotoFile,
  saveHistory, deleteHistory,
  saveAddTask, completeTask,
  saveAddLs, saveEditLs, deleteLs, addLocation,
  saveAddPot, saveEditPot, deletePot,
  goToLandscape, goToPot, toggleLs,

  // Photo UI
  openAddPhoto: (plantId) => openModal('mo-photo', plantId),
  setMainPhotoUI: (plantId, photoId) => setMainPhoto(plantId, photoId),
  deletePhotoUI:  (plantId, photoId) => deletePhoto(plantId, photoId),
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

  // Auth
  authSignInEmail:  () => {
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
  authSignOut: () => signOut(),
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
window.switchTab = function(tab) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById(`ntab-${tab}`)?.classList.add('on');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.getElementById(`page-${tab}`)?.classList.add('on');
  document.getElementById('srchInput').value = '';
  document.getElementById('fab').style.display = 'flex';
};

// ── Search ────────────────────────────────────────────────────────────────────
window.doSearch = function() {
  const val = document.getElementById('srchInput').value;
  const tab = document.querySelector('.nav-btn.on')?.id?.replace('ntab-','');
  if (tab === 'plants')     renderSpecies(val);
  if (tab === 'landscapes') renderLandscapes(val);
  if (tab === 'pots')       renderPots(val);
};

// ── Deals ─────────────────────────────────────────────────────────────────────
window.openDeals = () => openModal('mo-deals');

// ── Back navigation ───────────────────────────────────────────────────────────
window.addEventListener('popstate', () => {
  if (closeTop()) history.pushState(null, '', location.href);
});
history.pushState(null, '', location.href);

let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, {passive:true});
document.addEventListener('touchend', e => {
  if (e.changedTouches[0].clientX - touchStartX > 70 && touchStartX < 35) closeTop();
}, {passive:true});

document.addEventListener('change', e => {
  if (e.target.id === 'ap-style' || e.target.id === 'ep-style') {
    const wrap = e.target.id === 'ap-style' ? 'ap-style-other-wrap' : 'ep-style-other-wrap';
    document.getElementById(wrap).style.display = e.target.value === 'Другой' ? '' : 'none';
  }
});

// ── Auth UI ───────────────────────────────────────────────────────────────────
function showAuthScreen() {
  document.getElementById('app-main').style.display  = 'none';
  document.getElementById('app-auth').style.display  = 'flex';
}

function showAppScreen(user) {
  document.getElementById('app-auth').style.display  = 'none';
  document.getElementById('app-main').style.display  = 'block';
  document.getElementById('user-email').textContent  = user.email || 'Вы вошли';
}

// ── Service Worker ────────────────────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW:', e));
  }
}

window.requestNotifications = async function() {
  if (!('Notification' in window)) return alert('Уведомления не поддерживаются');
  const p = await Notification.requestPermission();
  document.getElementById('notifStatus').textContent = p === 'granted' ? '✅ Включены' : '❌ Отключены';
};

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await initSupabase();
  registerSW();

  // Auth state
  onAuthChange(async (user) => {
    if (user) {
      showAppScreen(user);
      await Promise.all([renderSpecies(), renderLandscapes(), renderPots(), updateBadge()]);
    } else {
      showAuthScreen();
    }
  });

  // Check current session
  const user = await getUser();
  if (user) {
    showAppScreen(user);
    await Promise.all([renderSpecies(), renderLandscapes(), renderPots(), updateBadge()]);
  } else {
    showAuthScreen();
  }
}

init();
