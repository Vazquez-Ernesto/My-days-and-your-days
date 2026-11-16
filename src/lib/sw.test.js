// Carga el service worker REAL (public/sw.js) en un entorno simulado y le manda notificaciones push.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateKey, encryptJSON } from './crypto.js';

const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');

function loadServiceWorker(keys) {
  const handlers = {};
  const shown = [];
  const fakeIndexedDB = {
    open() {
      const req = {};
      queueMicrotask(() => {
        req.result = {
          transaction: () => ({ objectStore: () => ({ get(name) { const g = {}; queueMicrotask(() => { g.result = keys[name]; g.onsuccess(); }); return g; } }) }),
          close() {},
        };
        req.onsuccess();
      });
      return req;
    },
  };
  const self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    registration: { scope: 'https://app/', showNotification: async (title, opts) => shown.push({ title, ...opts }) },
    clients: {},
    location: { origin: 'https://app' },
    skipWaiting: () => {},
  };
  new Function('self', 'indexedDB', 'caches', 'fetch', source)(self, fakeIndexedDB, {}, () => {});
  const push = async (payload) => {
    let done;
    handlers.push({ data: payload === undefined ? null : { json: () => payload }, waitUntil: (p) => { done = p; } });
    await done;
    return shown.at(-1);
  };
  return { push, shown };
}

describe('service worker: notificaciones push', () => {
  let pairKey, selfKey, sw;
  beforeEach(() => {
    pairKey = generateKey();
    selfKey = generateKey();
    sw = loadServiceWorker({ pair: pairKey, self: selfKey });
  });

  it('descifra la respuesta de él', async () => {
    const enc = await encryptJSON(pairKey, { type: 'reply', text: 'Te llevo chocolate 🍫', name: 'Ernesto' });
    expect(await sw.push({ type: 'message', key: 'pair', ...enc })).toMatchObject({
      title: 'Ernesto te respondió 💌', body: 'Te llevo chocolate 🍫', tag: 'reply',
    });
  });

  it('descifra el momento de ella', async () => {
    const enc = await encryptJSON(pairKey, { type: 'moment', id: 'missYou', name: 'Ana' });
    expect(await sw.push({ type: 'message', key: 'pair', ...enc })).toMatchObject({
      title: 'Ana compartió cómo se siente', body: '📞 Extraño tu voz',
    });
  });

  it('descifra un recordatorio programado con la clave propia del teléfono', async () => {
    const enc = await encryptJSON(selfKey, { title: 'Hora de tu píldora 💊', body: 'Marcala como tomada.', tag: 'pill:2026-11-20' });
    expect(await sw.push({ type: 'reminder', key: 'self', ...enc })).toMatchObject({
      title: 'Hora de tu píldora 💊', tag: 'pill:2026-11-20',
    });
  });

  it('avisos sin contenido privado: prueba y vinculación', async () => {
    expect((await sw.push({ type: 'test' })).title).toBe('¡Las notificaciones funcionan! 🎉');
    expect((await sw.push({ type: 'joined' })).title).toBe('Tu pareja aceptó la invitación 💞');
  });

  it('si no puede descifrar (otra clave, datos alterados o vacío) igual muestra algo genérico', async () => {
    const enc = await encryptJSON(generateKey(), { type: 'reply', text: 'secreto' });
    expect(await sw.push({ type: 'message', key: 'pair', ...enc })).toMatchObject({ title: 'My Days', body: 'Tenés novedades 💞' });
    expect(await sw.push(undefined)).toMatchObject({ title: 'My Days' });
    expect(await sw.push({ type: 'message' })).toMatchObject({ title: 'My Days' });
    expect(sw.shown.every((n) => !n.body.includes('secreto'))).toBe(true);
  });
});
