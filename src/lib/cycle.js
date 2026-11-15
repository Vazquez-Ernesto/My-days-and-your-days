// Motor de predicción del ciclo. Funciones puras: reciben datos, devuelven datos.
// Así se pueden testear sin React ni navegador.
import { addDays, diffDays, isBetween } from './dates.js';

export const LUTEAL_PHASE = 14; // la ovulación ocurre ~14 días antes del siguiente período
const MIN_CYCLE = 15;
const MAX_CYCLE = 60;

/** Agrupa días sueltos de sangrado en períodos [{start, end, length}]. Tolera 1 día de hueco. */
export function groupPeriods(periodDays) {
  const days = [...new Set(periodDays)].sort();
  const periods = [];
  for (const day of days) {
    const last = periods[periods.length - 1];
    if (last && diffDays(day, last.end) <= 2) {
      last.end = day;
    } else {
      periods.push({ start: day, end: day });
    }
  }
  return periods.map((p) => ({ ...p, length: diffDays(p.end, p.start) + 1 }));
}

/** Largos de ciclo reales (inicio a inicio), descartando valores absurdos. */
export function cycleLengths(periods) {
  const lengths = [];
  for (let i = 1; i < periods.length; i++) {
    const len = diffDays(periods[i].start, periods[i - 1].start);
    if (len >= MIN_CYCLE && len <= MAX_CYCLE) lengths.push(len);
  }
  return lengths;
}

function average(nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Promedios usando los últimos 6 ciclos. Si no hay historial, usa la configuración. */
export function averages(periods, settings) {
  const cycles = cycleLengths(periods).slice(-6);
  const lens = periods.map((p) => p.length).slice(-6);
  return {
    cycleLength: cycles.length ? Math.round(average(cycles)) : settings.cycleLength,
    periodLength: lens.length ? Math.round(average(lens)) : settings.periodLength,
    basedOnHistory: cycles.length > 0,
  };
}

function buildCycle(periodStart, cycleLength, periodLength) {
  const nextStart = addDays(periodStart, cycleLength);
  const ovulation = addDays(nextStart, -LUTEAL_PHASE);
  return {
    periodStart,
    periodEnd: addDays(periodStart, periodLength - 1),
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
  };
}

/**
 * Predice los próximos `count` períodos a partir del último registrado.
 * Si el período está atrasado, la primera predicción se corre a hoy.
 */
export function predictCycles(periods, settings, today, count = 3) {
  if (!periods.length) return [];
  const { cycleLength, periodLength } = averages(periods, settings);
  const last = periods[periods.length - 1];
  let start = addDays(last.start, cycleLength);
  if (start < today) start = today; // atrasado: asumimos que puede llegar hoy
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(buildCycle(start, cycleLength, periodLength));
    start = addDays(start, cycleLength);
  }
  return result;
}

/** Ventana fértil/ovulación del ciclo ACTUAL (el que empezó en el último período). */
function currentFertile(periods, settings) {
  if (!periods.length) return null;
  const { cycleLength, periodLength } = averages(periods, settings);
  return buildCycle(periods[periods.length - 1].start, cycleLength, periodLength);
}

/** Qué mostrar en un día del calendario. */
export function dayStatus(iso, { periodDays, periods, predictions, settings }) {
  if (periodDays.includes(iso)) return 'period';
  const cycles = [currentFertile(periods, settings), ...predictions].filter(Boolean);
  for (const c of cycles) {
    if (c !== cycles[0] && isBetween(iso, c.periodStart, c.periodEnd)) return 'predicted';
    if (iso === c.ovulation) return 'ovulation';
    if (isBetween(iso, c.fertileStart, c.fertileEnd)) return 'fertile';
  }
  return null;
}

/** Resumen para la pantalla de inicio. */
export function cycleSummary(periods, settings, today) {
  if (!periods.length) return null;
  const { cycleLength, periodLength } = averages(periods, settings);
  const last = periods[periods.length - 1];
  const cycleDay = diffDays(today, last.start) + 1;
  const expectedNext = addDays(last.start, cycleLength);
  const daysUntilNext = diffDays(expectedNext, today);
  const ovulationDay = cycleLength - LUTEAL_PHASE + 1; // día del ciclo

  let phase;
  if (isBetween(today, last.start, last.end)) phase = 'menstrual';
  else if (daysUntilNext < 0) phase = 'late';
  else if (cycleDay === ovulationDay) phase = 'ovulation';
  else if (cycleDay >= ovulationDay - 5 && cycleDay <= ovulationDay + 1) phase = 'fertile';
  else if (cycleDay < ovulationDay) phase = 'follicular';
  else phase = 'luteal';

  return {
    cycleDay, cycleLength, periodLength, daysUntilNext, expectedNext, phase,
    onPeriod: phase === 'menstrual',
    periodDay: phase === 'menstrual' ? diffDays(today, last.start) + 1 : null,
  };
}

/** Marca un inicio de período: agrega `length` días consecutivos. */
export function startPeriod(periodDays, startIso, length) {
  const added = Array.from({ length }, (_, i) => addDays(startIso, i));
  return [...new Set([...periodDays, ...added])].sort();
}

/** Termina el período: borra los días marcados después de `endIso` dentro del período actual. */
export function endPeriod(periodDays, endIso) {
  const periods = groupPeriods(periodDays);
  const current = periods.find((p) => isBetween(endIso, p.start, p.end));
  if (!current) return periodDays;
  return periodDays.filter((d) => !(d > endIso && d <= current.end));
}

export const PHASES = {
  menstrual: { label: 'Menstruación', tip: 'Descansá, hidratate y escuchá a tu cuerpo.' },
  follicular: { label: 'Fase folicular', tip: 'Suele subir la energía. Buen momento para nuevos planes.' },
  fertile: { label: 'Ventana fértil', tip: 'Probabilidad de embarazo alta.' },
  ovulation: { label: 'Día de ovulación', tip: 'Probabilidad de embarazo más alta del ciclo.' },
  luteal: { label: 'Fase lútea', tip: 'Pueden aparecer síntomas premenstruales.' },
  late: { label: 'Período atrasado', tip: 'Si el atraso continúa, considerá un test o consultar.' },
};
