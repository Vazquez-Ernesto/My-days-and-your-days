// Estadísticas del ciclo. Funciones puras (fáciles de testear): reciben datos, devuelven datos.
import { diffDays } from './dates.js';

const MIN_CYCLE = 15;
const MAX_CYCLE = 60;
/** Rango típico de un ciclo en personas adultas (días). */
export const TYPICAL_CYCLE = { min: 21, max: 35 };
/** Si el ciclo más corto y el más largo difieren en 7 días o menos, se considera regular. */
export const REGULAR_SPREAD = 7;

/** Ciclos completos: [{ start, length, periodLength }] (de un inicio de período al siguiente). */
export function cycleHistory(periods) {
  const out = [];
  for (let i = 1; i < periods.length; i++) {
    const length = diffDays(periods[i].start, periods[i - 1].start);
    if (length >= MIN_CYCLE && length <= MAX_CYCLE) {
      out.push({ start: periods[i - 1].start, length, periodLength: periods[i - 1].length });
    }
  }
  return out;
}

/**
 * ¿Qué tan regular es el ciclo? Usa los últimos `last` ciclos.
 * status: 'few' (menos de 3 ciclos) | 'regular' | 'irregular'.
 */
export function regularity(history, last = 6) {
  const lengths = history.slice(-last).map((c) => c.length);
  if (lengths.length < 3) return { status: 'few', count: lengths.length };
  const min = Math.min(...lengths);
  const max = Math.max(...lengths);
  const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  return { status: max - min <= REGULAR_SPREAD ? 'regular' : 'irregular', count: lengths.length, min, max, avg, spread: max - min };
}

export const PHASES = [
  { id: 'menstrual', label: 'Período' },
  { id: 'follicular', label: 'Folicular' },
  { id: 'fertile', label: 'Fértil' },
  { id: 'luteal', label: 'Lútea' },
];

/**
 * En qué fase aparece cada síntoma. Para los `top` síntomas más registrados devuelve
 * el porcentaje de sus apariciones en cada fase (cada fila suma 100).
 */
export function symptomsByPhase(logs, phaseOf, { from = '0000-00-00', top = 5 } = {}) {
  const rows = {};
  for (const [date, log] of Object.entries(logs)) {
    if (date < from || !log.symptoms?.length) continue;
    let phase = phaseOf(date);
    if (phase === 'ovulation') phase = 'fertile';
    if (!PHASES.some((p) => p.id === phase)) continue;
    for (const s of log.symptoms) {
      rows[s] ??= { symptom: s, total: 0, counts: { menstrual: 0, follicular: 0, fertile: 0, luteal: 0 } };
      rows[s].total++;
      rows[s].counts[phase]++;
    }
  }
  return Object.values(rows)
    .sort((a, b) => b.total - a.total || a.symptom.localeCompare(b.symptom))
    .slice(0, top)
    .map((r) => {
      const pct = Object.fromEntries(PHASES.map((p) => [p.id, Math.round((r.counts[p.id] / r.total) * 100)]));
      const peak = PHASES.reduce((best, p) => (r.counts[p.id] > r.counts[best] ? p.id : best), PHASES[0].id);
      return { ...r, pct, peak };
    });
}

/** Cuántas veces registró cada ánimo desde `from`, de mayor a menor. */
export function moodCounts(logs, from = '0000-00-00') {
  const counts = {};
  for (const [date, log] of Object.entries(logs)) {
    if (date >= from && log.mood) counts[log.mood] = (counts[log.mood] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Escala del mapa de calor: 0 = vacío, 1..4 = de menos a más. */
export function heatLevel(pct) {
  if (!pct) return 0;
  return Math.min(4, Math.ceil(pct / 25));
}

/** Marcas limpias para un eje (ej. 20, 25, 30, 35, 40). */
export function niceTicks(min, max, step = 5) {
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  return ticks;
}
