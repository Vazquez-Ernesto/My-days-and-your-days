import { describe, it, expect } from 'vitest';
import { dueReminders } from './reminders.js';
import { cycleSummary, groupPeriods, startPeriod } from './cycle.js';

const settings = { cycleLength: 28, periodLength: 5 };
const periods = groupPeriods(startPeriod([], '2026-11-01', 5)); // próximo: 29/11, ovulación: 15/11
const prefs = { daysBefore: 2, fertile: true };
const at = (today, p = prefs) => dueReminders(cycleSummary(periods, settings, today), p, today).map((r) => r.type);

describe('dueReminders', () => {
  it.each([
    ['2026-11-26', []],               // faltan 3 días: todavía no
    ['2026-11-27', ['period-soon']],  // faltan 2
    ['2026-11-28', ['period-soon']],  // falta 1
    ['2026-11-29', ['period-today']],
    ['2026-12-01', ['late']],
    ['2026-11-10', ['fertile']],      // inicio ventana fértil
    ['2026-11-15', ['ovulation']],
    ['2026-11-03', []],               // durante el período no avisa
  ])('el %s avisa %j', (today, expected) => {
    expect(at(today)).toEqual(expected);
  });

  it('respeta la preferencia de días de anticipación', () => {
    expect(at('2026-11-26', { daysBefore: 3, fertile: true })).toEqual(['period-soon']);
  });

  it('no avisa fertilidad si está desactivado', () => {
    expect(at('2026-11-15', { daysBefore: 2, fertile: false })).toEqual([]);
  });

  it('el id incluye la fecha para no repetir avisos', () => {
    const [r] = dueReminders(cycleSummary(periods, settings, '2026-11-28'), prefs, '2026-11-28');
    expect(r.id).toBe('period-soon:2026-11-28');
    expect(r.title).toBe('Tu período llega en 1 día');
  });

  it('sin datos no hay avisos', () => {
    expect(dueReminders(null, prefs, '2026-11-28')).toEqual([]);
  });
});
