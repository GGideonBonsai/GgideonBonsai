// sw.js — Service Worker for Gideon Bonsai
const CACHE_NAME = 'gideon-bonsai-v1';
const BASE = '/GgideonBonsai';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/css/style.css',
  BASE + '/js/config.js',
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
    )
  );
  self.clients.claim();
});

// ── Fetch (network first, fallback to cache) ──────────────────────────────────
self.addEventListener('fetch', e => {
  // Skip Supabase API calls — never cache those
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
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

// ── Scheduled local alarms ────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_ALARM') {
    const { id, title, body, timestamp } = e.data;
    const delay = timestamp - Date.now();
    if (delay <= 0) return;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: BASE + '/icons/icon-192.svg',
        tag: id,
        data: { url: BASE + '/' }
      });
    }, delay);
  }
});
