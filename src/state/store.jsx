import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { groupPeriods, predictCycles, cycleSummary, averages } from '../lib/cycle.js';
import { todayISO } from '../lib/dates.js';
import { hasFeature, PREDICTION_MONTHS } from './plans.js';
import { dueReminders, normalizeReminders, DEFAULT_REMINDERS } from '../lib/reminders.js';
import { DEFAULT_SHARES, DEFAULT_PARTNER_PREFS, partnerReminders, makeInviteCode } from '../lib/partner.js';

const STORAGE_KEY = 'mydays:v1';

export const EMPTY_LOG = {
  flow: null, symptoms: [], mood: null, note: '',
  sex: null, // null | 'protected' | 'unprotected'
  orgasm: false, weight: null, temp: null, pill: false,
  partnerNote: '', // nota PARA su pareja (la privada es `note`)
};

function isEmptyLog(log) {
  return Object.values(log).every((v) => v === null || v === false || v === '' || (Array.isArray(v) && !v.length));
}

const initialState = {
  onboarded: false,
  role: null, // 'self' (lleva su ciclo) | 'partner' (la pareja que acompaña)
  periodDays: [], // ['2026-11-01', ...]
  logs: {}, // { '2026-11-01': { ...EMPTY_LOG } }
  settings: { cycleLength: 28, periodLength: 5, theme: 'system', pin: null, reminders: DEFAULT_REMINDERS },
  plan: 'free', // 'free' | 'premium'  (en producción esto lo valida el servidor)
  notified: [], // ids de recordatorios ya enviados como notificación
  // Lo que ELLA comparte con su pareja
  sharing: { name: '', shares: DEFAULT_SHARES, moments: [], desire: null, inviteCode: null, inbox: [], seenReplyAt: null },
  // Lo que ÉL recibe (en la etapa A, datos de ejemplo; en la B, desde el servidor)
  partner: { snapshot: null, prefs: DEFAULT_PARTNER_PREFS, seenMomentAt: null, replies: [], myName: '', unlinked: false },
  // Conexión con el servidor (vacía = modo prueba, sin servidor)
  cloud: { deviceId: null, token: null, pairId: null, key: null, status: 'none', inviteCode: null, inviteExpiresAt: null,
    lastUploadHash: null, messagesSince: null, lastSyncAt: null,
    pushEnabled: false, selfKey: null, scheduleHash: null, lastMomentSentAt: null, lastNoteSent: null },
  // Cuestionario en pareja: { 'YYYY-MM-DD': { mine: [..5], sent, theirs: [..5], theirName } }
  quiz: { days: {} },
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw);
    const settings = { ...initialState.settings, ...saved.settings };
    settings.reminders = normalizeReminders(saved.settings?.reminders);
    const sharing = { ...initialState.sharing, ...saved.sharing, shares: { ...DEFAULT_SHARES, ...saved.sharing?.shares } };
    const partner = { ...initialState.partner, ...saved.partner, prefs: { ...DEFAULT_PARTNER_PREFS, ...saved.partner?.prefs } };
    // Quienes ya usaban la app (v0.3 o anterior) llevan su propio ciclo
    const role = saved.role ?? (saved.onboarded ? 'self' : null);
    const cloud = { ...initialState.cloud, ...saved.cloud };
    const quiz = { ...initialState.quiz, ...saved.quiz };
    return { ...initialState, ...saved, role, settings, sharing, partner, cloud, quiz };
  } catch {
    return initialState;
  }
}

/** Respuestas de él que ella todavía no vio → aviso. */
function replyReminders({ inbox = [], seenReplyAt }) {
  const last = inbox.at(-1);
  if (!last || (seenReplyAt && last.at <= seenReplyAt)) return [];
  return [{ id: `reply:${last.at}`, type: 'reply', time: '00:00', title: `${last.name || 'Tu pareja'} te respondió 💌`, body: last.text }];
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* modo privado o almacenamiento lleno: seguimos en memoria */
    }
  }, [state]);

  const derived = useMemo(() => {
    const today = todayISO();
    const periods = groupPeriods(state.periodDays);
    const months = PREDICTION_MONTHS[state.plan];
    const avg = averages(periods, state.settings);
    const count = Math.max(1, Math.round((months * 30.4) / avg.cycleLength));
    const summary = cycleSummary(periods, state.settings, today);
    return {
      today,
      periods,
      averages: avg,
      predictions: predictCycles(periods, state.settings, today, count),
      summary,
      reminders: state.role === 'partner'
        ? partnerReminders(state.partner.snapshot, state.partner.prefs, today, state.partner.seenMomentAt)
        : [...dueReminders(summary, state.settings.reminders, today, { pillTaken: Boolean(state.logs[today]?.pill) }),
          ...replyReminders(state.sharing)],
      notificationsEnabled: state.role === 'partner' ? state.partner.prefs.enabled : state.settings.reminders.enabled,
      can: (feature) => hasFeature(state.plan, feature),
    };
  }, [state]);

  const actions = useMemo(() => {
    const writeLog = (s, date, log) => {
      const logs = { ...s.logs };
      if (isEmptyLog(log)) delete logs[date];
      else logs[date] = log;
      return { ...s, logs };
    };
    return {
      update: (patch) => setState((s) => ({ ...s, ...patch })),
      updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      setPeriodDays: (periodDays) => setState((s) => ({ ...s, periodDays: [...periodDays].sort() })),
      togglePeriodDay: (date) => setState((s) => ({
        ...s,
        periodDays: s.periodDays.includes(date) ? s.periodDays.filter((d) => d !== date) : [...s.periodDays, date].sort(),
      })),
      saveLog: (date, log) => setState((s) => writeLog(s, date, log)),
      patchLog: (date, patch) => setState((s) => writeLog(s, date, { ...EMPTY_LOG, ...s.logs[date], ...patch })),
      updateReminders: (patch) => setState((s) => ({
        ...s, settings: { ...s.settings, reminders: { ...s.settings.reminders, ...patch } },
      })),
      updateReminder: (key, patch) => setState((s) => {
        const r = s.settings.reminders;
        return { ...s, settings: { ...s.settings, reminders: { ...r, [key]: { ...r[key], ...patch } } } };
      }),
      // --- modo pareja: lado de ella ---
      updateSharing: (patch) => setState((s) => ({ ...s, sharing: { ...s.sharing, ...patch } })),
      setShare: (key, on) => setState((s) => ({ ...s, sharing: { ...s.sharing, shares: { ...s.sharing.shares, [key]: on } } })),
      shareMoment: (id) => setState((s) => ({
        ...s, sharing: { ...s.sharing, moments: [...s.sharing.moments, { id, at: new Date().toISOString() }].slice(-30) },
      })),
      setDesire: (level) => setState((s) => ({ ...s, sharing: { ...s.sharing, desire: { level, at: new Date().toISOString() } } })),
      ensureInviteCode: () => setState((s) => (s.sharing.inviteCode ? s : { ...s, sharing: { ...s.sharing, inviteCode: makeInviteCode() } })),
      // --- modo pareja: lado de él ---
      linkPartner: (snapshot) => setState((s) => ({
        ...s, onboarded: true, role: 'partner', partner: { ...s.partner, snapshot, linkedAt: new Date().toISOString(), seenMomentAt: null, replies: [] },
      })),
      unlinkPartner: () => setState((s) => ({
        ...s, onboarded: false, role: null, partner: { ...initialState.partner, prefs: s.partner.prefs }, cloud: { ...initialState.cloud },
        quiz: { days: {} },
      })),
      // --- cuestionario ---
      answerQuiz: (date, answers) => setState((s) => ({
        ...s, quiz: { days: { ...s.quiz.days, [date]: { ...s.quiz.days[date], mine: answers, sent: false } } },
      })),
      markQuizSent: (dates) => setState((s) => {
        const days = { ...s.quiz.days };
        for (const d of dates) days[d] = { ...days[d], sent: true };
        return { ...s, quiz: { days } };
      }),
      receiveQuiz: (date, answers, name) => setState((s) => ({
        ...s, quiz: { days: { ...s.quiz.days, [date]: { ...s.quiz.days[date], theirs: answers, theirName: name || '' } } },
      })),
      // --- conexión con el servidor ---
      updateCloud: (patch) => setState((s) => ({ ...s, cloud: { ...s.cloud, ...patch } })),
      /** Ella se desvincula: borra la conexión pero conserva su ciclo y su dispositivo registrado. */
      resetPairing: () => setState((s) => ({
        ...s, cloud: { ...initialState.cloud, deviceId: s.cloud.deviceId, token: s.cloud.token,
          pushEnabled: s.cloud.pushEnabled, selfKey: s.cloud.selfKey },
        sharing: { ...s.sharing, inbox: [], seenReplyAt: null, inviteCode: null },
        quiz: { days: {} },
      })),
      setPartnerSnapshot: (snapshot) => setState((s) => ({ ...s, partner: { ...s.partner, snapshot } })),
      setPartnerUnlinked: () => setState((s) => ({ ...s, partner: { ...s.partner, unlinked: true } })),
      updatePartner: (patch) => setState((s) => ({ ...s, partner: { ...s.partner, ...patch } })),
      receiveReplies: (items, since) => setState((s) => ({
        ...s, cloud: { ...s.cloud, messagesSince: since ?? s.cloud.messagesSince },
        sharing: { ...s.sharing, inbox: [...s.sharing.inbox, ...items].slice(-20) },
      })),
      markRepliesSeen: () => setState((s) => ({ ...s, sharing: { ...s.sharing, seenReplyAt: s.sharing.inbox.at(-1)?.at ?? null } })),
      markRepliesSent: (ats) => setState((s) => ({
        ...s, partner: { ...s.partner, replies: s.partner.replies.map((r) => (ats.includes(r.at) ? { ...r, sent: true } : r)) },
      })),
      updatePartnerPrefs: (patch) => setState((s) => ({ ...s, partner: { ...s.partner, prefs: { ...s.partner.prefs, ...patch } } })),
      markMomentSeen: (at) => setState((s) => ({ ...s, partner: { ...s.partner, seenMomentAt: at } })),
      sendReply: (text) => setState((s) => ({
        ...s, partner: { ...s.partner, replies: [...s.partner.replies, { text, at: new Date().toISOString() }].slice(-20) },
      })),
      markNotified: (ids) => setState((s) => ({ ...s, notified: [...s.notified, ...ids].slice(-50) })),
      reset: () => setState({ ...initialState }),
    };
  }, []);

  return (
    <StoreContext.Provider value={{ state, ...derived, ...actions }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return ctx;
}
