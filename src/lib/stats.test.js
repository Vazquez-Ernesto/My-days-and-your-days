import { describe, it, expect } from 'vitest';
import { cycleHistory, regularity, symptomsByPhase, moodCounts, heatLevel, niceTicks } from './stats.js';
import { groupPeriods } from './cycle.js';
import { addDays } from './dates.js';

const period = (start, n = 5) => Array.from({ length: n }, (_, i) => addDays(start, i));

describe('estadísticas', () => {
  it('arma el historial de ciclos completos (sin el actual) y descarta largos absurdos', () => {
    const periods = groupPeriods([...period('2026-07-01'), ...period('2026-07-29', 4), ...period('2026-08-28'), ...period('2026-11-20')]);
    expect(cycleHistory(periods)).toEqual([
      { start: '2026-07-01', length: 28, periodLength: 5 },
      { start: '2026-07-29', length: 30, periodLength: 4 },
      // 28/8 → 20/11 son 84 días: probablemente faltan registros, no se cuenta
    ]);
  });

  it('regularidad: necesita 3 ciclos; regular si varía 7 días o menos', () => {
    const h = (lengths) => lengths.map((length) => ({ length }));
    expect(regularity(h([28, 30]))).toEqual({ status: 'few', count: 2 });
    expect(regularity(h([27, 29, 31, 28]))).toMatchObject({ status: 'regular', min: 27, max: 31, avg: 29, spread: 4 });
    expect(regularity(h([24, 35, 28]))).toMatchObject({ status: 'irregular', spread: 11 });
    // solo mira los últimos 6
    expect(regularity(h([45, 28, 28, 29, 28, 30, 29]))).toMatchObject({ status: 'regular', count: 6 });
  });

  it('síntomas por fase: porcentaje de apariciones en cada fase (la ovulación cuenta como fértil)', () => {
    const logs = {
      '2026-11-01': { symptoms: ['Cólicos', 'Cansancio'] },
      '2026-11-02': { symptoms: ['Cólicos'] },
      '2026-11-03': { symptoms: ['Cólicos'] },
      '2026-11-14': { symptoms: ['Cólicos', 'Hinchazón'] },
      '2026-11-25': { symptoms: ['Hinchazón'] },
    };
    const phaseOf = (d) => ({ '2026-11-01': 'menstrual', '2026-11-02': 'menstrual', '2026-11-03': 'menstrual', '2026-11-14': 'ovulation', '2026-11-25': 'luteal' })[d];
    const rows = symptomsByPhase(logs, phaseOf);
    expect(rows.map((r) => r.symptom)).toEqual(['Cólicos', 'Hinchazón', 'Cansancio']);
    expect(rows[0]).toMatchObject({ total: 4, peak: 'menstrual', pct: { menstrual: 75, follicular: 0, fertile: 25, luteal: 0 } });
    expect(rows[1]).toMatchObject({ total: 2, pct: { fertile: 50, luteal: 50 } });
  });

  it('ánimo: de más a menos registrado', () => {
    const logs = { a: { mood: 'calm' }, b: { mood: 'happy' }, c: { mood: 'happy' }, d: {} };
    expect(moodCounts(logs)).toEqual([['happy', 2], ['calm', 1]]);
  });

  it('mapa de calor en 4 niveles y ejes con números redondos', () => {
    expect([0, 1, 25, 26, 50, 75, 100].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 4]);
    expect(niceTicks(23, 37)).toEqual([20, 25, 30, 35, 40]);
  });
});
