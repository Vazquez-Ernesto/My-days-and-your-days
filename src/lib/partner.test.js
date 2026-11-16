import { describe, it, expect } from 'vitest';
import {
  buildSnapshot, snapshotView, partnerTips, partnerReminders, latestMoment, demoSnapshot,
  makeInviteCode, inviteLink, inviteCodeFromHash, timeAgo, DEFAULT_SHARES, DEFAULT_PARTNER_PREFS,
} from './partner.js';
import { startPeriod } from './cycle.js';

const NOW = new Date('2026-11-20T15:00:00Z');
const baseState = (shares = DEFAULT_SHARES) => ({
  periodDays: [...startPeriod([], '2026-10-06', 5), ...startPeriod([], '2026-11-03', 5)],
  settings: { cycleLength: 28, periodLength: 5 },
  logs: {
    '2026-11-19': { symptoms: ['Cólicos'], mood: 'sad', sex: 'protected', weight: 60, note: 'privado' },
    '2026-09-01': { symptoms: ['Acné'], mood: null },
  },
  sharing: { name: ' Ana ', shares, moments: [{ id: 'sensitive', at: '2026-11-20T14:00:00.000Z' }], desire: { level: 70 } },
});

describe('buildSnapshot: ella decide qué se comparte', () => {
  it('por defecto comparte ciclo y momentos, pero no síntomas', () => {
    const snap = buildSnapshot(baseState(), NOW);
    expect(snap.name).toBe('Ana');
    expect(snap.cycle).toMatchObject({ cycleLength: 28, periodLength: 5 });
    expect(snap.moments).toHaveLength(1);
    expect(snap.desire).toEqual({ level: 70 });
    expect(snap.days).toBeUndefined();
  });

  it('nunca incluye notas, relaciones ni peso', () => {
    const snap = buildSnapshot(baseState({ cycle: true, moments: true, symptoms: true, fertile: true }), NOW);
    const json = JSON.stringify(snap);
    expect(json).not.toContain('privado');
    expect(json).not.toContain('protected');
    expect(json).not.toContain('weight');
  });

  it('con síntomas activados comparte solo los últimos 30 días', () => {
    const snap = buildSnapshot(baseState({ ...DEFAULT_SHARES, symptoms: true }), NOW);
    expect(snap.days).toEqual({ '2026-11-19': { symptoms: ['Cólicos'], mood: 'sad' } });
  });

  it('sin permisos no comparte nada del ciclo ni momentos', () => {
    const snap = buildSnapshot(baseState({ cycle: false, moments: false, symptoms: false, fertile: false }), NOW);
    expect(snap.cycle).toBeUndefined();
    expect(snap.moments).toBeUndefined();
    expect(snapshotView(snap, '2026-11-20')).toBeNull();
  });
});

describe('vista de él', () => {
  it('calcula el ciclo de ella desde el snapshot', () => {
    const view = snapshotView(buildSnapshot(baseState(), NOW), '2026-11-20');
    expect(view.summary).toMatchObject({ cycleDay: 18, daysUntilNext: 11, phase: 'luteal' });
  });

  it('consejos: primero el momento, después síntomas y fase (máximo 3)', () => {
    const tips = partnerTips({ summary: { phase: 'luteal' }, symptomsToday: ['Cólicos'], moment: { id: 'sensitive' } });
    expect(tips).toHaveLength(3);
    expect(tips[0]).toMatch(/sensible/);
    expect(tips[1]).toMatch(/cólicos/);
    expect(tips[2]).toMatch(/premenstruales/);
  });

  it('el último momento trae emoji y texto', () => {
    expect(latestMoment(buildSnapshot(baseState(), NOW))).toMatchObject({ id: 'sensitive', emoji: '🥺', label: 'Sensible' });
  });
});

describe('avisos para él', () => {
  const snap = buildSnapshot(baseState(), NOW); // período el 1/12
  const types = (today, seen) => partnerReminders(snap, DEFAULT_PARTNER_PREFS, today, seen).map((r) => r.type);

  it('avisa 2 días antes, el día previsto y cuando empezó', () => {
    expect(types('2026-11-28', 'x')).toEqual([]);
    expect(types('2026-11-29', 'x')).toEqual(['p-soon']);
    expect(types('2026-12-01', 'x')).toEqual(['p-today']);
    const started = buildSnapshot({ ...baseState(), periodDays: [...baseState().periodDays, '2026-12-01'] }, NOW);
    expect(partnerReminders(started, DEFAULT_PARTNER_PREFS, '2026-12-01', 'x').map((r) => r.type)).toEqual(['p-started']);
  });

  it('avisa un momento nuevo solo una vez', () => {
    expect(types('2026-11-20', null)).toEqual(['moment']);
    expect(types('2026-11-20', '2026-11-20T14:00:00.000Z')).toEqual([]);
    const [r] = partnerReminders(snap, DEFAULT_PARTNER_PREFS, '2026-11-20', null);
    expect(r.title).toBe('Ana compartió: 🥺 Sensible');
  });
});

describe('invitación', () => {
  it('genera códigos legibles con formato XXXX-XXXX', () => {
    expect(makeInviteCode()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(makeInviteCode(() => 0)).toBe('AAAA-AAAA');
  });
  it('arma el link y lo vuelve a leer', () => {
    const link = inviteLink('AB2C-D3EF', 'https://x.github.io/My-days/');
    expect(link).toBe('https://x.github.io/My-days/#invitacion-AB2C-D3EF');
    expect(inviteCodeFromHash(new URL(link).hash)).toBe('AB2C-D3EF');
    expect(inviteCodeFromHash('#otra-cosa')).toBeNull();
  });
});

describe('utilidades', () => {
  it('timeAgo', () => {
    expect(timeAgo('2026-11-20T14:58:00Z', NOW)).toBe('hace 2 min');
    expect(timeAgo('2026-11-20T12:00:00Z', NOW)).toBe('hace 3 h');
    expect(timeAgo('2026-11-18T15:00:00Z', NOW)).toBe('hace 2 días');
  });
  it('los datos de ejemplo dejan el período a 2 días', () => {
    const view = snapshotView(demoSnapshot(NOW), '2026-11-20');
    expect(view.summary.daysUntilNext).toBe(2);
  });
});
