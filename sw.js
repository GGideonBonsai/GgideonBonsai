// sw.js — Service Worker for Gideon Bonsai
const CACHE_NAME = 'gideon-bonsai-v2';
const BASE = '/GgideonBonsai';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/css/style.css',
  BASE + '/js/config.js',
  BASE + '/js/dialog.js',
  BASE + '/js/supabase.js',
  BASE + '/js/app.js',
  BASE + '/js/render.js',
  BASE + '/js/modals.js',
  BASE + '/icons/icon-192.svg',
  BASE + '/icons/icon-512.svg',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => {
      self.clients.claim();
      // Restore alarm after SW restart
      _restoreAlarm();
    })
  );
});

// ── Fetch (network first, fallback to cache) ──────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push Notifications (от сервера, если когда-нибудь понадобится) ─────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Gideon Bonsai', body: 'Напоминание' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: BASE + '/icons/icon-192.svg',
      badge: BASE + '/icons/icon-192.svg',
      tag: data.tag || 'reminder',
      data: { url: BASE + '/' }
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const url = BASE + '/';
      for (const client of list) {
        if (client.url.includes(BASE) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Periodic Background Sync (Chrome/Android) ─────────────────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'daily-reminder') {
    e.waitUntil(_fireReminderIfTime());
  }
});

// ── Messages from app ─────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_ALARM') {
    const { title, body, timestamp } = e.data;
    _saveAlarm({ title, body, timestamp });
    _scheduleTimer({ title, body, timestamp });
  }
});

// ── Alarm helpers ─────────────────────────────────────────────────────────────

// Хранение расписания через Cache API (доступен в SW без IndexedDB-зависимостей)
const ALARM_CACHE = 'gideon-alarm-v1';
const ALARM_KEY   = 'alarm-data';

async function _saveAlarm(alarm) {
  const cache = await caches.open(ALARM_CACHE);
  const res = new Response(JSON.stringify(alarm), {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put(ALARM_KEY, res);
}

async function _loadAlarm() {
  try {
    const cache = await caches.open(ALARM_CACHE);
    const res = await cache.match(ALARM_KEY);
    if (!res) return null;
    return await res.json();
  } catch { return null; }
}

async function _clearAlarm() {
  const cache = await caches.open(ALARM_CACHE);
  await cache.delete(ALARM_KEY);
}

let _alarmTimer = null;

function _scheduleTimer(alarm) {
  if (_alarmTimer) clearTimeout(_alarmTimer);
  const delay = alarm.timestamp - Date.now();
  if (delay <= 0) {
    _fireNotification(alarm);
    return;
  }
  // setTimeout работает пока SW жив.
  // При убийстве SW — _restoreAlarm() при следующем запуске восстановит его.
  _alarmTimer = setTimeout(() => _fireNotification(alarm), Math.min(delay, 2147483647));
}

async function _restoreAlarm() {
  const alarm = await _loadAlarm();
  if (!alarm) return;
  const delay = alarm.timestamp - Date.now();
  if (delay < -60000) {
    // Прошло больше минуты — уведомление устарело, чистим
    await _clearAlarm();
    return;
  }
  if (delay <= 0) {
    // Опоздали меньше чем на минуту — показываем сразу
    await _fireNotification(alarm);
  } else {
    _scheduleTimer(alarm);
  }
}

async function _fireNotification(alarm) {
  await _clearAlarm();
  await self.registration.showNotification(alarm.title || '🌿 Gideon Bonsai', {
    body:    alarm.body || 'Есть дела по уходу за растениями',
    icon:    BASE + '/icons/icon-192.svg',
    badge:   BASE + '/icons/icon-192.svg',
    tag:     'daily-reminder',
    renotify: true,
    data:    { url: BASE + '/' }
  });
}

// Для Periodic Background Sync — показываем если уже пора
async function _fireReminderIfTime() {
  const alarm = await _loadAlarm();
  if (!alarm) return;
  const diff = Date.now() - alarm.timestamp;
  // Показываем если прошло не более 6 часов после запланированного времени
  if (diff >= 0 && diff < 6 * 3600 * 1000) {
    await _fireNotification(alarm);
  }
}
