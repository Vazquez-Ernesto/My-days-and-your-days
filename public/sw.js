// Service worker de My Days: hace que la app funcione sin internet.
// Al cambiar algo importante, subí la versión para que se borre la caché vieja.
const CACHE = 'mydays-v0.12.0';
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

// ===================== Notificaciones push =====================
// El servidor manda el contenido CIFRADO; acá lo desciframos con la clave que guardó la app en IndexedDB.

const MOMENTS = {
  good: '🌸 Bien', meh: '🌻 Más o menos', sad: '🥀 Triste', sensitive: '🥺 Sensible', tired: '😴 Cansada',
  thinking: '💭 Pensando en ti', missYou: '📞 Extraño tu voz', cuddles: '🤗 Necesito mimos',
};

function readKey(name) {
  return new Promise((resolve) => {
    const req = indexedDB.open('mydays', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('keys');
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      const get = db.transaction('keys', 'readonly').objectStore('keys').get(name);
      get.onsuccess = () => { resolve(get.result ?? null); db.close(); };
      get.onerror = () => { resolve(null); db.close(); };
    };
  });
}

const fromB64 = (b64) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function decrypt(keyName, ciphertext, iv) {
  const raw = await readKey(keyName);
  if (!raw || !ciphertext) return null;
  const key = await crypto.subtle.importKey('raw', fromB64(raw), 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function buildNotification(data) {
  const generic = { title: 'My Days', body: 'Tenés novedades 💞', tag: 'mydays' };
  try {
    if (data.type === 'test') return { title: '¡Las notificaciones funcionan! 🎉', body: 'Así te van a llegar los avisos de My Days.', tag: 'test' };
    if (data.type === 'joined') return { title: 'Tu pareja aceptó la invitación 💞', body: 'Ya pueden compartir sus días.', tag: 'joined' };
    const p = await decrypt(data.key, data.ciphertext, data.iv);
    if (!p) return generic;
    if (data.type === 'reminder') return { title: p.title, body: p.body, tag: p.tag || 'reminder' };
    if (p.type === 'reply') return { title: `${p.name || 'Tu pareja'} te respondió 💌`, body: p.text, tag: 'reply' };
    if (p.type === 'moment') return { title: `${p.name || 'Tu pareja'} compartió cómo se siente`, body: MOMENTS[p.id] || '💞', tag: 'moment' };
    if (p.type === 'note') return { title: `${p.name || 'Tu pareja'} te dejó una nota 💌`, body: p.text, tag: 'note' };
    if (p.type === 'quiz' && p.complete) return { title: '¡Ya están los resultados! 💞', body: 'Veamos qué tan en sintonía están 🔥', tag: `quiz:${p.date}` };
    if (p.type === 'quiz') return { title: `${p.name || 'Tu pareja'} ya respondió el cuestionario 👀`, body: 'Respondé vos para ver los resultados.', tag: `quiz:${p.date}` };
    return generic;
  } catch {
    return generic; // en iPhone SIEMPRE hay que mostrar algo, o iOS desactiva las notificaciones
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  event.waitUntil(buildNotification(data).then((n) => self.registration.showNotification(n.title, {
    body: n.body, tag: n.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: 'es', data: { url: self.registration.scope },
  })));
});
