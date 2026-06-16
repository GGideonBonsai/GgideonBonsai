// sw.js — Service Worker for Gideon Bonsai
const CACHE_NAME = 'gideon-bonsai-v1';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/db.js', '/js/render.js', '/js/modals.js', '/js/app.js'];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch (offline first) ─────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Gideon Bonsai', body: 'Напоминание' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'reminder',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const url = e.notification.data?.url || '/';
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Local Alarm Scheduling ────────────────────────────────────────────────────
// Fired from app.js via postMessage to schedule local notifications
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_ALARM') {
    const { id, title, body, timestamp } = e.data;
    const delay = timestamp - Date.now();
    if (delay <= 0) return;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        tag: id,
        data: { url: '/' }
      });
    }, delay);
  }
});
