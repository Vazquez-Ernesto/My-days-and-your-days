// Utilidades de fechas. Trabajamos SIEMPRE con strings 'YYYY-MM-DD'
// y cálculos en UTC para evitar errores por cambio de horario (DST).

const DAY_MS = 24 * 60 * 60 * 1000;

export function toISO(date) {
  return date.toISOString().slice(0, 10);
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function todayISO(now = new Date()) {
  // Usamos la fecha local del usuario, no la UTC
  return toISO(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(iso, n) {
  return toISO(new Date(fromISO(iso).getTime() + n * DAY_MS));
}

export function diffDays(a, b) {
  // Días desde b hasta a (a - b)
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / DAY_MS);
}

export function isBetween(iso, start, end) {
  return iso >= start && iso <= end; // comparar strings ISO funciona
}

export function monthMatrix(year, month) {
  // Devuelve semanas (lunes a domingo) para pintar el calendario
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const start = addDays(toISO(first), -offset);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) week.push(addDays(start, w * 7 + d));
    weeks.push(week);
  }
  return weeks;
}

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function formatLong(iso) {
  const d = fromISO(iso);
  return `${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()].toLowerCase()}`;
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export function formatShort(iso) {
  const d = fromISO(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export { MONTHS_SHORT };
