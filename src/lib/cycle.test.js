import { describe, it, expect } from 'vitest';
import {
  groupPeriods, cycleLengths, averages, predictCycles, cycleSummary,
  startPeriod, endPeriod, dayStatus,
} from './cycle.js';
import { addDays, monthMatrix, diffDays } from './dates.js';

const settings = { cycleLength: 28, periodLength: 5 };

describe('dates', () => {
  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // bisiesto
  });
  it('calcula diferencias de días', () => {
    expect(diffDays('2026-03-01', '2026-02-01')).toBe(28);
  });
  it('arma el calendario empezando en lunes', () => {
    const weeks = monthMatrix(2026, 10); // noviembre 2026, el 1 es domingo
    expect(weeks[0][0]).toBe('2026-10-26');
    expect(weeks[0][6]).toBe('2026-11-01');
  });
});

describe('groupPeriods', () => {
  it('agrupa días consecutivos y tolera 1 día de hueco', () => {
    const p = groupPeriods(['2026-01-01', '2026-01-02', '2026-01-04', '2026-01-29']);
    expect(p).toEqual([
      { start: '2026-01-01', end: '2026-01-04', length: 4 },
      { start: '2026-01-29', end: '2026-01-29', length: 1 },
    ]);
  });
  it('ignora duplicados y desorden', () => {
    expect(groupPeriods(['2026-01-02', '2026-01-01', '2026-01-01'])).toHaveLength(1);
  });
});

describe('promedios', () => {
  const periods = groupPeriods([
    ...startPeriod([], '2026-01-01', 5),
    ...startPeriod([], '2026-01-31', 4),
    ...startPeriod([], '2026-03-02', 4),
  ]);
  it('calcula el largo de cada ciclo', () => {
    expect(cycleLengths(periods)).toEqual([30, 30]);
  });
  it('usa historial si existe', () => {
    expect(averages(periods, settings)).toMatchObject({ cycleLength: 30, periodLength: 4, basedOnHistory: true });
  });
  it('usa configuración si no hay historial', () => {
    expect(averages([], settings)).toMatchObject({ cycleLength: 28, periodLength: 5, basedOnHistory: false });
  });
  it('descarta ciclos imposibles (>60 días)', () => {
    const p = groupPeriods(['2026-01-01', '2026-06-01']);
    expect(cycleLengths(p)).toEqual([]);
  });
});

describe('predictCycles', () => {
  const periods = groupPeriods(startPeriod([], '2026-11-01', 5));
  it('predice próximo período, ovulación y ventana fértil', () => {
    const [next] = predictCycles(periods, settings, '2026-11-10', 1);
    expect(next.periodStart).toBe('2026-11-29');
    expect(next.periodEnd).toBe('2026-12-03');
    expect(next.ovulation).toBe('2026-12-13'); // 14 días antes del siguiente (12-27)
    expect(next.fertileStart).toBe('2026-12-08');
  });
  it('si está atrasado, corre la predicción a hoy', () => {
    const [next] = predictCycles(periods, settings, '2026-12-05', 1);
    expect(next.periodStart).toBe('2026-12-05');
  });
  it('sin datos no predice', () => {
    expect(predictCycles([], settings, '2026-11-10')).toEqual([]);
  });
});

describe('cycleSummary', () => {
  const periods = groupPeriods(startPeriod([], '2026-11-01', 5));
  it.each([
    ['2026-11-03', 'menstrual', 3],
    ['2026-11-08', 'follicular', 8],
    ['2026-11-12', 'fertile', 12],
    ['2026-11-15', 'ovulation', 15],
    ['2026-11-20', 'luteal', 20],
    ['2026-12-01', 'late', 31],
  ])('el %s está en fase %s (día %i)', (today, phase, day) => {
    const s = cycleSummary(periods, settings, today);
    expect(s.phase).toBe(phase);
    expect(s.cycleDay).toBe(day);
  });
  it('cuenta días hasta el próximo período', () => {
    expect(cycleSummary(periods, settings, '2026-11-20').daysUntilNext).toBe(9);
  });
});

describe('start/end period', () => {
  it('terminar el período borra los días sobrantes', () => {
    const days = startPeriod([], '2026-11-01', 5);
    expect(endPeriod(days, '2026-11-03')).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });
});

describe('dayStatus', () => {
  const periodDays = startPeriod([], '2026-11-01', 5);
  const periods = groupPeriods(periodDays);
  const predictions = predictCycles(periods, settings, '2026-11-10', 2);
  const ctx = { periodDays, periods, predictions, settings };
  it('clasifica los días del calendario', () => {
    expect(dayStatus('2026-11-02', ctx)).toBe('period');
    expect(dayStatus('2026-11-15', ctx)).toBe('ovulation');
    expect(dayStatus('2026-11-12', ctx)).toBe('fertile');
    expect(dayStatus('2026-11-30', ctx)).toBe('predicted');
    expect(dayStatus('2026-11-22', ctx)).toBe(null);
  });
});

import { cycleDayOf, phaseOfDay, pregnancyChance, nextFertileWindow, symptomPattern, symptomCounts } from './cycle.js';

describe('v0.3: día del ciclo, fases y probabilidad', () => {
  const periodDays = [...startPeriod([], '2026-10-04', 5), ...startPeriod([], '2026-11-01', 5)];
  const periods = groupPeriods(periodDays);
  const predictions = predictCycles(periods, settings, '2026-11-10', 2);

  it('calcula el día del ciclo de cualquier fecha', () => {
    expect(cycleDayOf('2026-10-04', periods, predictions)).toBe(1);
    expect(cycleDayOf('2026-10-31', periods, predictions)).toBe(28);
    expect(cycleDayOf('2026-11-15', periods, predictions)).toBe(15);
    expect(cycleDayOf('2026-12-01', periods, predictions)).toBe(3); // ciclo previsto que empieza 29/11
    expect(cycleDayOf('2026-09-01', periods, predictions)).toBe(null);
  });

  it.each([
    [3, 'menstrual', 'baja'], [8, 'follicular', 'baja'], [10, 'fertile', 'media'],
    [13, 'fertile', 'alta'], [15, 'ovulation', 'alta'], [16, 'fertile', 'media'], [20, 'luteal', 'baja'],
  ])('día %i → fase %s, probabilidad %s', (day, phase, chance) => {
    expect(phaseOfDay(day, 28, 5)).toBe(phase);
    expect(pregnancyChance(day, 28, 5)).toBe(chance);
  });

  it('ventana fértil: próxima, en curso o del siguiente ciclo', () => {
    expect(nextFertileWindow(periods, settings, predictions, '2026-11-05'))
      .toMatchObject({ start: '2026-11-10', end: '2026-11-16', active: false, daysUntil: 5 });
    expect(nextFertileWindow(periods, settings, predictions, '2026-11-12')).toMatchObject({ active: true });
    expect(nextFertileWindow(periods, settings, predictions, '2026-11-20')).toMatchObject({ start: '2026-12-08' });
  });

  it('arma el patrón de un síntoma por ciclo', () => {
    const logs = { '2026-10-05': { symptoms: ['Cólicos'] }, '2026-11-02': { symptoms: ['Cólicos', 'Acné'] } };
    const rows = symptomPattern('Cólicos', periods, logs, '2026-11-10');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ start: '2026-11-01', current: true, length: 10 });
    expect(rows[0].days[1]).toBe(true);  // día 2
    expect(rows[1]).toMatchObject({ start: '2026-10-04', length: 28 });
    expect(rows[1].days.filter(Boolean)).toHaveLength(1);
  });

  it('cuenta síntomas por rango y por fase', () => {
    const logs = {
      '2026-10-05': { symptoms: ['Cólicos'] },
      '2026-11-02': { symptoms: ['Cólicos', 'Acné'] },
      '2026-11-12': { symptoms: ['Hinchazón'] },
    };
    const phaseOf = (date) => phaseOfDay(cycleDayOf(date, periods, predictions), 28, 5);
    expect(symptomCounts(logs, { from: '2026-10-01' })).toEqual({
      total: 4, top: [['Cólicos', 2], ['Acné', 1], ['Hinchazón', 1]],
    });
    expect(symptomCounts(logs, { from: '2026-11-01' }).total).toBe(3);
    expect(symptomCounts(logs, { from: '2026-10-01', phase: 'fertile', phaseOf }).top).toEqual([['Hinchazón', 1]]);
    expect(symptomCounts(logs, { from: '2026-10-01', phase: 'menstrual', phaseOf }).total).toBe(3);
  });
});
