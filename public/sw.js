// Service worker de My Days: hace que la app funcione sin internet.
// Al cambiar algo importante, subí la versión para que se borre la caché vieja.
const CACHE = 'mydays-v0.3.0';
// Rutas relativas a la ubicación del service worker (funciona también en una subcarpeta)
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Páginas: primero red (para tener la última versión), si falla usamos la caché.
    event.respondWith(
      fetch(request)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // JS, CSS, imágenes: primero caché (los nombres llevan hash, nunca cambian).
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
      return res;
    })),
  );
});

// Al tocar una notificación, abrimos (o enfocamos) la app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((wins) => {
      const open = wins.find((w) => 'focus' in w);
      return open ? open.focus() : self.clients.openWindow(self.registration.scope);
    }),
  );
});
