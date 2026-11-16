// Motor de sincronización con el servidor. Corre al abrir la app, cada 20 s y al volver a la app.
// - Ella: espera a que él acepte, sube su snapshot cifrado (solo si cambió) y baja las respuestas de él.
// - Él: baja el snapshot de ella, envía sus respuestas pendientes y detecta si lo desvincularon.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { api as defaultApi } from './api.js';
import { encryptJSON, decryptJSON, fingerprint } from './crypto.js';
import { buildSnapshot } from './partner.js';
import { SYNC_INTERVAL_MS } from './config.js';

const GONE = ['PAIR_NOT_FOUND', 'NOT_A_MEMBER', 'NO_PAIR'];

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
      const msgs = await api.getMessages(c.token, c.pairId, c.messagesSince);
      if (msgs.length) {
        const items = [];
        for (const m of msgs.filter((x) => !x.fromMe)) {
          try {
            const p = await decryptJSON(c.key, m);
            if (p.type === 'reply') items.push({ text: p.text, name: p.name || '', at: m.createdAt });
          } catch { /* mensaje ilegible: lo ignoramos */ }
        }
        receiveReplies(items, msgs.at(-1).createdAt);
      }
    } catch (e) {
      if (GONE.includes(e.code)) return resetPairing(); // él la desvinculó
      throw e;
    }
  }, [api]);

  const syncPartner = useCallback(async () => {
    const { state, setPartnerSnapshot, setPartnerUnlinked, markRepliesSent } = ref.current;
    const c = state.cloud;
    try {
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

  // Él: mandar una respuesta enseguida
  const pendingReplies = role === 'partner' ? store.state.partner.replies.filter((r) => !r.sent).length : 0;
  useEffect(() => {
    if (pendingReplies) syncNow();
  }, [pendingReplies, syncNow]);

  return { syncNow, error };
}
