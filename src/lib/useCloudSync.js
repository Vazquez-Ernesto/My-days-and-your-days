// Motor de sincronización con el servidor. Corre al abrir la app, cada 20 s y al volver a la app.
// - Ella: espera a que él acepte, sube su snapshot cifrado (solo si cambió) y baja las respuestas de él.
// - Él: baja el snapshot de ella, envía sus respuestas pendientes y detecta si lo desvincularon.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { api as defaultApi } from './api.js';
import { encryptJSON, decryptJSON, fingerprint } from './crypto.js';
import { buildSnapshot } from './partner.js';
import { storeKeys, syncSchedule } from './push.js';
import { SYNC_INTERVAL_MS } from './config.js';

const GONE = ['PAIR_NOT_FOUND', 'NOT_A_MEMBER', 'NO_PAIR'];

/** Envía las respuestas del cuestionario que todavía no se mandaron (las dos personas). */
async function sendQuizAnswers(api, { state, markQuizSent }, myName) {
  const c = state.cloud;
  const pending = Object.entries(state.quiz.days).filter(([, d]) => d.mine && !d.sent);
  for (const [date, d] of pending) {
    await api.postMessage(c.token, c.pairId, await encryptJSON(c.key, {
      type: 'quiz', date, answers: d.mine, name: myName, complete: Boolean(d.theirs),
    }));
  }
  if (pending.length) markQuizSent(pending.map(([date]) => date));
}

/** Procesa mensajes del otro: respuestas de él (para ella) y cuestionarios (para los dos). */
async function readMessages(api, { state, receiveQuiz }, since) {
  const c = state.cloud;
  const msgs = await api.getMessages(c.token, c.pairId, since);
  const replies = [];
  for (const m of msgs.filter((x) => !x.fromMe)) {
    try {
      const p = await decryptJSON(c.key, m);
      if (p.type === 'reply') replies.push({ text: p.text, name: p.name || '', at: m.createdAt });
      if (p.type === 'quiz' && Array.isArray(p.answers)) receiveQuiz(p.date, p.answers, p.name);
    } catch { /* mensaje ilegible: lo ignoramos */ }
  }
  return { replies, last: msgs.at(-1)?.createdAt ?? null };
}

export function useCloudSync(api = defaultApi) {
  const store = useStore();
  const ref = useRef(store);
  ref.current = store; // siempre la última versión del estado, sin reiniciar el intervalo
  const busy = useRef(false);
  const [error, setError] = useState(null);

  const syncOwner = useCallback(async () => {
    const { state, updateCloud, resetPairing, receiveReplies } = ref.current;
    const c = state.cloud;
    let status = c.status;
    if (status === 'pending') {
      try {
        const pair = await api.myPair(c.token);
        status = pair.status === 'ACTIVE' ? 'active' : 'pending';
        if (status === 'active') updateCloud({ status, inviteCode: null, inviteExpiresAt: null });
      } catch (e) {
        if (GONE.includes(e.code)) return resetPairing();
        throw e;
      }
    }
    if (status !== 'active') return;

    // Subir el snapshot solo si cambió (comparamos una huella, sin la fecha de actualización)
    const { updatedAt, ...content } = buildSnapshot(state);
    const hash = await fingerprint(JSON.stringify(content));
    try {
      if (hash !== c.lastUploadHash) {
        await api.putSnapshot(c.token, c.pairId, await encryptJSON(c.key, { ...content, updatedAt }));
        updateCloud({ lastUploadHash: hash });
      }
      // Momento nuevo → mensaje cifrado, así a él le llega una notificación al instante
      const moment = state.sharing.shares.moments ? state.sharing.moments.at(-1) : null;
      if (moment && moment.at > (c.lastMomentSentAt ?? '') && Date.now() - new Date(moment.at) < 6 * 3.6e6) {
        await api.postMessage(c.token, c.pairId, await encryptJSON(c.key, { type: 'moment', id: moment.id, name: state.sharing.name }));
        updateCloud({ lastMomentSentAt: moment.at });
      }
      // Nota nueva para él → mensaje cifrado (notificación al instante; el contenido igual viaja en el snapshot)
      const today = ref.current.today;
      const note = state.sharing.shares.notes ? state.logs[today]?.partnerNote?.trim() : '';
      if (note && `${today}|${note}` !== c.lastNoteSent) {
        await api.postMessage(c.token, c.pairId, await encryptJSON(c.key, { type: 'note', text: note, name: state.sharing.name, date: today }));
        updateCloud({ lastNoteSent: `${today}|${note}` });
      }
      await sendQuizAnswers(api, ref.current, state.sharing.name);
      const { replies, last } = await readMessages(api, ref.current, c.messagesSince);
      if (last) receiveReplies(replies, last);
    } catch (e) {
      if (GONE.includes(e.code)) return resetPairing(); // él la desvinculó
      throw e;
    }
  }, [api]);

  const syncPartner = useCallback(async () => {
    const { state, setPartnerSnapshot, setPartnerUnlinked, markRepliesSent, updatePartner } = ref.current;
    const c = state.cloud;
    try {
      await sendQuizAnswers(api, ref.current, state.partner.myName);
      const { last } = await readMessages(api, ref.current, state.partner.messagesSince);
      if (last) updatePartner({ messagesSince: last });
      const pending = state.partner.replies.filter((r) => !r.sent);
      for (const r of pending) {
        await api.postMessage(c.token, c.pairId, await encryptJSON(c.key, { type: 'reply', text: r.text, name: state.partner.myName }));
      }
      if (pending.length) markRepliesSent(pending.map((r) => r.at));
      try {
        const remote = await api.getSnapshot(c.token, c.pairId);
        if (remote.updatedAt !== state.partner.snapshot?.syncedAt) {
          const snap = await decryptJSON(c.key, remote);
          setPartnerSnapshot({ ...snap, syncedAt: remote.updatedAt });
        }
      } catch (e) {
        if (e.code !== 'NO_SNAPSHOT') throw e; // todavía no compartió nada: seguimos esperando
      }
    } catch (e) {
      if (GONE.includes(e.code)) return setPartnerUnlinked();
      throw e;
    }
  }, [api]);

  const syncNow = useCallback(async () => {
    const { state } = ref.current;
    const c = state.cloud;
    if (!c.token || !c.pairId || !c.key || busy.current) return;
    if (state.role === 'partner' && state.partner.unlinked) return;
    busy.current = true;
    try {
      if (state.role === 'partner') await syncPartner();
      else await syncOwner();
      ref.current.updateCloud({ lastSyncAt: new Date().toISOString() });
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      busy.current = false;
    }
  }, [syncOwner, syncPartner]);

  const { cloud, role } = store.state;
  const linked = Boolean(cloud.pairId && cloud.key);
  useEffect(() => {
    if (!linked) return undefined;
    syncNow();
    const id = setInterval(syncNow, SYNC_INTERVAL_MS);
    const onVisible = () => document.visibilityState === 'visible' && syncNow();
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [linked, role, syncNow]);

  // Ella: cuando cambia lo que comparte (o envía un momento), sincronizamos enseguida
  const shareKey = role === 'self' && cloud.status === 'active'
    ? JSON.stringify([store.state.sharing.moments.at(-1), store.state.sharing.shares, store.state.sharing.name, store.state.periodDays.length])
    : null;
  useEffect(() => {
    if (!shareKey) return undefined;
    const t = setTimeout(syncNow, 1500);
    return () => clearTimeout(t);
  }, [shareKey, syncNow]);

  // Cuestionario respondido o nota nueva → enviar enseguida
  const quizPending = Object.values(store.state.quiz.days).filter((d) => d.mine && !d.sent).length;
  const noteToday = role === 'self' ? store.state.logs[store.today]?.partnerNote ?? '' : '';
  useEffect(() => {
    if (!linked) return undefined;
    const t = setTimeout(syncNow, 800);
    return () => clearTimeout(t);
  }, [quizPending, noteToday, linked, syncNow]);

  // Él: mandar una respuesta enseguida
  const pendingReplies = role === 'partner' ? store.state.partner.replies.filter((r) => !r.sent).length : 0;
  useEffect(() => {
    if (pendingReplies) syncNow();
  }, [pendingReplies, syncNow]);

  // Notificaciones push: claves para el service worker + calendario de recordatorios cifrado
  const { pushEnabled, key, selfKey } = cloud;
  useEffect(() => {
    if (pushEnabled) storeKeys({ pair: key, self: selfKey });
  }, [pushEnabled, key, selfKey]);
  const scheduleKey = pushEnabled
    ? JSON.stringify([store.today, store.state.periodDays, store.state.settings.reminders, store.state.settings.cycleLength,
      store.state.settings.periodLength, store.state.logs[store.today]?.pill, role, store.state.partner.snapshot?.syncedAt,
      store.state.partner.prefs, Object.keys(store.state.quiz.days).filter((d) => store.state.quiz.days[d].mine).join(','),
      cloud.status, cloud.pairId])
    : null;
  useEffect(() => {
    if (!scheduleKey) return undefined;
    const t = setTimeout(() => {
      syncSchedule(ref.current, ref.current.today).catch((e) => setError(e));
    }, 2000);
    return () => clearTimeout(t);
  }, [scheduleKey]);

  return { syncNow, error };
}
