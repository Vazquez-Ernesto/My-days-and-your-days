// Notificaciones push (llegan aunque la app esté cerrada).
// - El teléfono se suscribe al servicio de push (Apple/Google) y le pasa esa "dirección" a nuestro servidor.
// - Los recordatorios de los próximos 7 días se calculan acá, se CIFRAN con una clave propia del teléfono
//   y se suben al servidor, que solo conoce la hora de envío.
// - El service worker (public/sw.js) descifra y muestra cada notificación.
import { api, ApiError } from './api.js';
import { generateKey, encryptJSON, fingerprint } from './crypto.js';
import { groupPeriods, cycleSummary } from './cycle.js';
import { dueReminders } from './reminders.js';
import { partnerReminders } from './partner.js';
import { addDays } from './dates.js';

export const SCHEDULE_DAYS = 7;
export const QUIZ_TIME = '19:00';

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// ---------- claves para el service worker (IndexedDB, porque el SW no puede leer localStorage) ----------

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('mydays', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('keys');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeKeys({ pair, self }) {
  try {
    const db = await idb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('keys', 'readwrite');
      const store = tx.objectStore('keys');
      if (pair) store.put(pair, 'pair'); else store.delete('pair');
      if (self) store.put(self, 'self');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* sin IndexedDB: las notificaciones mostrarán un texto genérico */ }
}

function b64ToBytes(b64) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Registra el teléfono si hace falta, pide permiso y suscribe al servicio de push. */
export async function enablePush({ state, updateCloud }) {
  if (!pushSupported()) throw new ApiError(0, 'PUSH_UNSUPPORTED');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new ApiError(0, 'PUSH_DENIED');

  let { token, deviceId, selfKey } = state.cloud;
  if (!token) ({ token, deviceId } = await api.registerDevice());
  if (!selfKey) selfKey = generateKey();

  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await api.getPushKey();
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    // Si el servidor cambió sus claves, hay que suscribirse de nuevo
    const current = sub.options?.applicationServerKey ? btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))) : null;
    if (current && current.replace(/=+$/, '') !== btoa(String.fromCharCode(...b64ToBytes(publicKey))).replace(/=+$/, '')) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
  await api.putSubscription(token, sub.toJSON());
  await storeKeys({ pair: state.cloud.key, self: selfKey });
  updateCloud({ token, deviceId, selfKey, pushEnabled: true, scheduleHash: null });
}

export async function disablePush({ state, updateCloud }) {
  try {
    const reg = await navigator.serviceWorker.ready;
    await (await reg.pushManager.getSubscription())?.unsubscribe();
  } catch { /* ignoramos */ }
  if (state.cloud.token) await api.deleteSubscription(state.cloud.token).catch(() => {});
  updateCloud({ pushEnabled: false, scheduleHash: null });
}

/** Instante exacto (en la zona horaria del teléfono) para 'YYYY-MM-DD' + 'HH:MM'. */
export function localInstant(isoDay, hhmm) {
  return new Date(`${isoDay}T${hhmm}:00`);
}

/**
 * Recordatorios de los próximos días, igual que los avisos de la pantalla Hoy pero calculados a futuro.
 * Devuelve [{ sendAt: Date, payload: { title, body, tag } }].
 */
export function buildSchedule(state, now = new Date(), today) {
  const items = [];
  const days = Array.from({ length: SCHEDULE_DAYS }, (_, i) => addDays(today, i));
  if (state.role === 'partner') {
    const snap = state.partner.snapshot;
    if (!snap || snap.demo || snap.waiting) return [];
    for (const day of days) {
      for (const r of partnerReminders(snap, state.partner.prefs, day, '9999')) { // '9999': los momentos van por otro lado
        items.push({ sendAt: localInstant(day, r.time), payload: { title: r.title, body: r.body, tag: r.id } });
      }
    }
  } else {
    const periods = groupPeriods(state.periodDays);
    for (const day of days) {
      const summary = cycleSummary(periods, state.settings, day);
      const pillTaken = day === today && Boolean(state.logs[today]?.pill);
      for (const r of dueReminders(summary, state.settings.reminders, day, { pillTaken })) {
        items.push({ sendAt: localInstant(day, r.time), payload: { title: r.title, body: r.body, tag: r.id } });
      }
    }
  }
  // Cuestionario del día (solo con la pareja vinculada de verdad)
  const linked = state.role === 'partner'
    ? Boolean(state.cloud?.pairId && state.partner?.snapshot && !state.partner.snapshot.demo)
    : state.cloud?.status === 'active';
  if (linked) {
    for (const day of days) {
      if (state.quiz?.days?.[day]?.mine) continue; // ya lo respondió
      items.push({
        sendAt: localInstant(day, QUIZ_TIME),
        payload: { title: 'Ya está el cuestionario del día 💬', body: '5 preguntas para conocerse más. Respondé y mirá en qué coinciden.', tag: `quiz:${day}` },
      });
    }
  }
  return items.filter((i) => i.sendAt > now).sort((a, b) => a.sendAt - b.sendAt).slice(0, 100);
}

/** Sube los recordatorios cifrados si cambiaron desde la última vez. Devuelve true si subió algo. */
export async function syncSchedule({ state, updateCloud }, today, now = new Date()) {
  const c = state.cloud;
  if (!c.pushEnabled || !c.token || !c.selfKey) return false;
  const items = buildSchedule(state, now, today);
  const hash = await fingerprint(JSON.stringify(items));
  if (hash === c.scheduleHash) return false;
  const encrypted = [];
  for (const i of items) {
    const { ciphertext, iv } = await encryptJSON(c.selfKey, i.payload);
    encrypted.push({ sendAt: i.sendAt.toISOString(), ciphertext, iv });
  }
  await api.putSchedule(c.token, encrypted);
  updateCloud({ scheduleHash: hash });
  return true;
}
