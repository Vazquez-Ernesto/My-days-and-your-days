// Modo pareja: qué comparte ella, cómo lo ve él, consejos y avisos para él.
// Todo son funciones puras: en la etapa B el "snapshot" viajará cifrado por el servidor.
import { groupPeriods, predictCycles, cycleSummary, averages } from './cycle.js';
import { addDays, diffDays, todayISO } from './dates.js';

export const MOMENTS = [
  { id: 'good', emoji: '🌸', label: 'Bien' },
  { id: 'meh', emoji: '🌻', label: 'Más o menos' },
  { id: 'sad', emoji: '🥀', label: 'Triste' },
  { id: 'sensitive', emoji: '🥺', label: 'Sensible' },
  { id: 'tired', emoji: '😴', label: 'Cansada' },
  { id: 'thinking', emoji: '💭', label: 'Pensando en ti' },
  { id: 'missYou', emoji: '📞', label: 'Extraño tu voz' },
  { id: 'cuddles', emoji: '🤗', label: 'Necesito mimos' },
];

export const REPLIES = ['Te llevo chocolate 🍫', '¿Necesitás algo? 💗', 'Te llamo en un rato 📞', 'Te amo ❤️', 'Paso a buscarte 🚗', 'Hoy cocino yo 🍝'];

export const DEFAULT_SHARES = { cycle: true, moments: true, symptoms: false, fertile: false };

export const SHARE_LABELS = {
  cycle: { label: 'Fase y días hasta el período', help: 'Tu anillo del ciclo y el calendario de períodos' },
  moments: { label: 'Mi momento', help: 'Cómo te sentís y tu deseo, cuando vos lo compartas' },
  symptoms: { label: 'Síntomas y ánimo', help: 'De los últimos 30 días, para que sepa cómo ayudarte' },
  fertile: { label: 'Ventana fértil y ovulación', help: 'Si buscan (o evitan) un embarazo' },
};

export const DEFAULT_PARTNER_PREFS = {
  enabled: false, // notificaciones del sistema en el teléfono de él
  periodSoon: { on: true, daysBefore: 2 },
  periodStart: { on: true },
  moments: { on: true },
};

/** Arma lo que ella comparte, respetando sus permisos. */
export function buildSnapshot(state, now = new Date()) {
  const { sharing, periodDays, settings, logs } = state;
  const s = sharing.shares;
  const snap = { v: 1, name: sharing.name?.trim() || 'Tu pareja', updatedAt: now.toISOString(), shares: { ...s } };
  if (s.cycle) {
    snap.cycle = { periodDays: [...periodDays], cycleLength: settings.cycleLength, periodLength: settings.periodLength };
  }
  if (s.moments) {
    snap.moments = sharing.moments.slice(-10);
    snap.desire = sharing.desire;
  }
  if (s.symptoms) {
    const from = addDays(todayISO(now), -30);
    snap.days = {};
    for (const [date, log] of Object.entries(logs)) {
      if (date < from || (!log.symptoms?.length && !log.mood)) continue;
      snap.days[date] = { symptoms: log.symptoms ?? [], mood: log.mood ?? null };
    }
  }
  return snap;
}

/** Calcula el ciclo de ella a partir del snapshot (null si no comparte el ciclo). */
export function snapshotView(snap, today) {
  if (!snap?.cycle) return null;
  const settings = { cycleLength: snap.cycle.cycleLength, periodLength: snap.cycle.periodLength };
  const periods = groupPeriods(snap.cycle.periodDays);
  return {
    settings,
    periods,
    periodDays: snap.cycle.periodDays,
    averages: averages(periods, settings),
    predictions: predictCycles(periods, settings, today, 3),
    summary: cycleSummary(periods, settings, today),
  };
}

export function latestMoment(snap) {
  const m = snap?.moments?.at(-1);
  if (!m) return null;
  return { ...m, ...MOMENTS.find((x) => x.id === m.id) };
}

const PHASE_TIPS = {
  menstrual: ['Los primeros días suelen ser los más pesados: ofrecé encargarte de la comida o de la casa.',
    'Una bolsa de agua caliente o un té calentito ayudan con los cólicos.'],
  follicular: ['Suele tener más energía estos días: buen momento para proponer un plan o una salida.'],
  fertile: ['Su energía y su deseo suelen estar más altos estos días.'],
  ovulation: ['Su energía y su deseo suelen estar más altos estos días.'],
  luteal: ['Pueden aparecer síntomas premenstruales: paciencia y planes tranquilos.',
    'Los antojos son normales en esta fase: un snack sorpresa suma puntos.'],
  late: ['Su período está atrasado y puede estar preocupada: preguntale cómo se siente, sin presionar.'],
};

const SYMPTOM_TIPS = {
  'Cólicos': 'Tiene cólicos: bolsa de agua caliente, té y mimos.',
  'Dolor de cabeza': 'Le duele la cabeza: luz tenue, silencio y un vaso de agua.',
  'Cansancio': 'Está cansada: ofrecé encargarte de las tareas de hoy.',
  'Antojos': 'Tiene antojos: un chocolate puede ser un gran gesto.',
  'Hinchazón': 'Se siente hinchada: evitá comentarios sobre su cuerpo y proponé algo cómodo.',
  'Dolor lumbar': 'Le duele la espalda: un masaje suave puede ayudar.',
  'Insomnio': 'Durmió mal: dejala descansar y bajá el ritmo.',
  'Náuseas': 'Tiene náuseas: comidas livianas y mucho líquido.',
};

const MOMENT_TIPS = {
  sad: 'Compartió que está triste: escuchala sin intentar resolver todo.',
  sensitive: 'Compartió que está sensible: un abrazo vale más que un consejo.',
  tired: 'Está cansada: un plan tranquilo en casa puede ser ideal.',
  thinking: 'Está pensando en vos 💭: mandale un mensaje.',
  missYou: 'Te extraña: una llamada corta le alegra el día.',
  cuddles: 'Necesita mimos: ya sabés qué hacer 🤗',
};

/** Consejos para él, priorizando lo más concreto: momento > síntomas de hoy > fase. Máximo 3. */
export function partnerTips({ summary, symptomsToday = [], moment = null }) {
  const tips = [];
  if (moment && MOMENT_TIPS[moment.id]) tips.push(MOMENT_TIPS[moment.id]);
  for (const s of symptomsToday) if (SYMPTOM_TIPS[s]) tips.push(SYMPTOM_TIPS[s]);
  if (summary) tips.push(...(PHASE_TIPS[summary.phase] ?? []));
  return [...new Set(tips)].slice(0, 3);
}

/** Avisos para él. El id lleva fecha (o la hora del momento) para no repetirse. */
export function partnerReminders(snap, prefs, today, seenMomentAt = null) {
  if (!snap) return [];
  const out = [];
  const name = snap.name;
  const view = snapshotView(snap, today);
  const s = view?.summary;
  const add = (type, title, body, idSuffix = today) => out.push({ id: `${type}:${idSuffix}`, type, time: '09:00', title, body });

  if (s) {
    const d = s.daysUntilNext;
    if (prefs.periodStart.on && s.onPeriod && s.periodDay === 1) {
      add('p-started', `Empezó el período de ${name}`, 'Hoy puede necesitar un poco más de cuidado 💗');
    } else if (prefs.periodSoon.on && !s.onPeriod && s.phase !== 'late' && d === 0) {
      add('p-today', `El período de ${name} podría llegar hoy`, 'Estate atento a cómo se siente.');
    } else if (prefs.periodSoon.on && !s.onPeriod && d > 0 && d <= prefs.periodSoon.daysBefore) {
      add('p-soon', `El período de ${name} llega en ${d} día${d === 1 ? '' : 's'}`, 'Buen momento para tener paciencia extra y algún mimo preparado.');
    }
  }
  const m = latestMoment(snap);
  if (prefs.moments.on && m && (!seenMomentAt || m.at > seenMomentAt)) {
    out.push({ id: `moment:${m.at}`, type: 'moment', time: '00:00', title: `${name} compartió: ${m.emoji} ${m.label}`, body: 'Tocá para responderle.' });
  }
  return out;
}

/** "hace 5 min", "hace 2 h", "hace 3 días". */
export function timeAgo(iso, now = new Date()) {
  const min = Math.max(0, Math.round((now - new Date(iso)) / 60000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} día${d === 1 ? '' : 's'}`;
}

/** Código de invitación legible (sin letras que se confunden: 0/O, 1/I/L). */
export function makeInviteCode(random = Math.random) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(random() * chars.length)]).join('').replace(/^(.{4})/, '$1-');
}

export function inviteLink(code, base = window.location.href) {
  const url = new URL(base);
  url.hash = `invitacion-${code}`;
  return url.toString();
}

export function inviteCodeFromHash(hash) {
  const m = /^#invitacion-([A-Z0-9]{4}-[A-Z0-9]{4})$/.exec(hash ?? '');
  return m ? m[1] : null;
}

/** Datos de ejemplo para probar el rol pareja sin servidor. */
export function demoSnapshot(now = new Date()) {
  const today = todayISO(now);
  const start = addDays(today, -26); // ciclo de 28: su período llega en 2 días
  const days = (s, n) => Array.from({ length: n }, (_, i) => addDays(s, i));
  const minutesAgo = (m) => new Date(now.getTime() - m * 60000).toISOString();
  return {
    v: 1, name: 'Ana', demo: true, updatedAt: minutesAgo(5),
    shares: { cycle: true, moments: true, symptoms: true, fertile: false },
    cycle: { periodDays: [...days(addDays(start, -56), 5), ...days(addDays(start, -28), 5), ...days(start, 5)], cycleLength: 28, periodLength: 5 },
    moments: [{ id: 'good', at: minutesAgo(60 * 26) }, { id: 'sensitive', at: minutesAgo(40) }],
    desire: { level: 35, at: minutesAgo(40) },
    days: { [today]: { symptoms: ['Antojos', 'Hinchazón'], mood: 'sensitive' } },
  };
}

export { diffDays };
