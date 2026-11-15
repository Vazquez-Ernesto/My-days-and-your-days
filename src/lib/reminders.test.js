import { describe, it, expect } from 'vitest';
import { dueReminders, normalizeReminders, isTimeReached, DEFAULT_REMINDERS } from './reminders.js';
import { cycleSummary, groupPeriods, startPeriod } from './cycle.js';

const settings = { cycleLength: 28, periodLength: 5 };
const periods = groupPeriods(startPeriod([], '2026-11-01', 5)); // próximo: 29/11, ovulación: 15/11
const all = normalizeReminders({ fertile: true }); // fértil + ovulación activados
const at = (today, prefs = all, extra) => dueReminders(cycleSummary(periods, settings, today), prefs, today, extra).map((r) => r.type);

describe('dueReminders', () => {
  it.each([
    ['2026-11-26', []],               // faltan 3 días: todavía no
    ['2026-11-27', ['period-soon']],  // faltan 2
    ['2026-11-28', ['period-soon']],  // falta 1
    ['2026-11-29', ['period-today']],
    ['2026-12-01', ['late']],
    ['2026-11-10', ['fertile']],      // inicio ventana fértil
    ['2026-11-15', ['ovulation']],
    ['2026-11-03', []],               // durante el período (día 3 de 5) no avisa
    ['2026-11-05', ['period-end']],   // día 5 de 5: ¿terminó?
  ])('el %s avisa %j', (today, expected) => {
    expect(at(today)).toEqual(expected);
  });

  it('respeta los días de anticipación', () => {
    const prefs = normalizeReminders({ periodStart: { daysBefore: 3 } });
    expect(at('2026-11-26', prefs)).toEqual(['period-soon']);
  });

  it('no avisa lo que está desactivado', () => {
    const prefs = normalizeReminders({ ovulation: { on: false }, periodStart: { on: false } });
    expect(at('2026-11-15', prefs)).toEqual([]);
    expect(at('2026-11-28', prefs)).toEqual([]);
  });

  it('píldora: avisa todos los días hasta que se marca tomada', () => {
    const prefs = normalizeReminders({ pill: { on: true } });
    expect(at('2026-11-20', prefs)).toEqual(['pill']);
    expect(at('2026-11-20', prefs, { pillTaken: true })).toEqual([]);
  });

  it('cita médica: avisa el día anterior y el mismo día', () => {
    const prefs = normalizeReminders({ appointment: { on: true, date: '2026-11-21', time: '15:30', note: 'Ginecóloga' } });
    const [before] = dueReminders(null, prefs, '2026-11-20');
    expect(before.title).toBe('Mañana tenés cita médica a las 15:30');
    const [same] = dueReminders(null, prefs, '2026-11-21');
    expect(same).toMatchObject({ title: 'Hoy tenés cita médica a las 15:30', body: 'No te olvides: Ginecóloga.' });
    expect(dueReminders(null, prefs, '2026-11-22')).toEqual([]);
  });

  it('el id incluye la fecha y la hora del aviso viaja con él', () => {
    const [r] = dueReminders(cycleSummary(periods, settings, '2026-11-28'), all, '2026-11-28');
    expect(r).toMatchObject({ id: 'period-soon:2026-11-28', time: '09:00', title: 'Tu período llega en 1 día' });
  });
});

describe('normalizeReminders', () => {
  it('migra el formato viejo de v0.2', () => {
    const r = normalizeReminders({ enabled: true, daysBefore: 4, fertile: false });
    expect(r.enabled).toBe(true);
    expect(r.periodStart.daysBefore).toBe(4);
    expect(r.fertile.on).toBe(false);
    expect(r.ovulation.on).toBe(false);
  });
  it('sin datos usa los valores por defecto', () => {
    expect(normalizeReminders()).toEqual(DEFAULT_REMINDERS);
  });
});

describe('isTimeReached', () => {
  it('compara la hora actual con la del aviso', () => {
    expect(isTimeReached('09:00', new Date('2026-11-20T08:59:00'))).toBe(false);
    expect(isTimeReached('09:00', new Date('2026-11-20T09:00:00'))).toBe(true);
  });
});
