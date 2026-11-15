// Decide qué recordatorios corresponden HOY. Función pura: fácil de testear.
import { addDays } from './dates.js';

export const DEFAULT_REMINDERS = {
  enabled: false, // notificaciones del sistema (los avisos dentro de la app se ven siempre)
  periodStart: { on: true, time: '09:00', daysBefore: 2 },
  periodEnd: { on: true, time: '20:00' },
  ovulation: { on: true, time: '09:00' },
  fertile: { on: false, time: '09:00' },
  logPeriod: { on: true, time: '12:00' },
  pill: { on: false, time: '21:00' },
  appointment: { on: false, date: '', time: '10:00', note: '' },
};

/** Completa valores faltantes y migra el formato de v0.2 ({ enabled, daysBefore, fertile }). */
export function normalizeReminders(saved = {}) {
  const r = structuredClone(DEFAULT_REMINDERS);
  if (typeof saved.enabled === 'boolean') r.enabled = saved.enabled;
  if (typeof saved.daysBefore === 'number') r.periodStart.daysBefore = saved.daysBefore;
  if (typeof saved.fertile === 'boolean') { r.fertile.on = saved.fertile; r.ovulation.on = saved.fertile; }
  for (const key of Object.keys(DEFAULT_REMINDERS)) {
    if (saved[key] && typeof saved[key] === 'object') r[key] = { ...r[key], ...saved[key] };
  }
  return r;
}

/**
 * @param summary  resultado de cycleSummary()
 * @param prefs    recordatorios normalizados
 * @param extra    { pillTaken }
 * @returns [{ id, type, title, body, time }] — el id incluye la fecha para no avisar dos veces el mismo día
 */
export function dueReminders(summary, prefs, today, { pillTaken = false } = {}) {
  const out = [];
  const add = (type, item, title, body) => out.push({ id: `${type}:${today}`, type, time: item.time, title, body });

  if (summary) {
    const d = summary.daysUntilNext;
    const ps = prefs.periodStart;
    if (summary.phase === 'late') {
      if (prefs.logPeriod.on) add('late', prefs.logPeriod, 'Período atrasado', `Lleva ${-d} día${d === -1 ? '' : 's'} de atraso. ¿Te vino? Registralo.`);
    } else if (ps.on && !summary.onPeriod && d === 0) {
      add('period-today', ps, 'Tu período podría llegar hoy', 'Tené a mano lo que necesites 💗');
    } else if (ps.on && !summary.onPeriod && d > 0 && d <= ps.daysBefore) {
      add('period-soon', ps, `Tu período llega en ${d} día${d === 1 ? '' : 's'}`, 'Un buen momento para prepararte.');
    }
    if (prefs.periodEnd.on && summary.onPeriod && summary.periodDay >= summary.periodLength) {
      add('period-end', prefs.periodEnd, '¿Terminó tu período?', 'Si ya terminó, marcalo para mejorar tus predicciones.');
    }
    if (prefs.fertile.on && summary.cycleDay === summary.ovulationDay - 5) {
      add('fertile', prefs.fertile, 'Empieza tu ventana fértil', 'Probabilidad de embarazo alta durante los próximos días.');
    }
    if (prefs.ovulation.on && summary.cycleDay === summary.ovulationDay) {
      add('ovulation', prefs.ovulation, 'Hoy es tu día de ovulación estimado', 'Probabilidad de embarazo más alta del ciclo.');
    }
  }

  if (prefs.pill.on && !pillTaken) add('pill', prefs.pill, 'Hora de tu píldora 💊', 'Marcala como tomada cuando la tomes.');

  const ap = prefs.appointment;
  if (ap.on && ap.date) {
    const what = ap.note ? `: ${ap.note}` : '';
    if (ap.date === today) add('appointment', ap, `Hoy tenés cita médica a las ${ap.time}`, `No te olvides${what}.`);
    else if (ap.date === addDays(today, 1)) add('appointment', { time: '09:00' }, `Mañana tenés cita médica a las ${ap.time}`, `Preparate${what}.`);
  }
  return out;
}

/** true si ya pasó la hora del recordatorio (formato 'HH:MM'). */
export function isTimeReached(time, now) {
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return hhmm >= time;
}
