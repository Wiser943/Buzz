// Minimal service worker: enables install + notifications. It never caches files, so redeploys show up immediately.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
self.addEventListener('push', e => { let d = {}; try { d = e.data.json(); } catch (_) {} e.waitUntil(self.registration.showNotification(d.title || 'Buzzer', { body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url || '/' } })); });
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then(l => { const c = l.find(x => 'focus' in x); return c ? c.focus() : clients.openWindow((e.notification.data && e.notification.data.url) || '/'); })); });
