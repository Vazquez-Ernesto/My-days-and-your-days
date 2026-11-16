import { describe, it, expect } from 'vitest';
import { buildSchedule, localInstant } from './push.js';
import { normalizeReminders } from './reminders.js';
import { startPeriod } from './cycle.js';
import { demoSnapshot, DEFAULT_PARTNER_PREFS, buildSnapshot, DEFAULT_SHARES } from './partner.js';

const NOW = localInstant('2026-11-20', '10:00');
const self = (reminders, logs = {}) => ({
  role: 'self',
  periodDays: startPeriod([], '2026-10-26', 5), // próximo período: 23/11
  settings: { cycleLength: 28, periodLength: 5, reminders: normalizeReminders(reminders) },
  logs,
});
const titles = (items) => items.map((i) => `${i.sendAt.toISOString().slice(0, 16)} ${i.payload.title}`);

describe('calendario de recordatorios push (próximos 7 días)', () => {
  it('programa los avisos del período a su hora y en orden', () => {
    const items = buildSchedule(self({}), NOW, '2026-11-20');
    expect(titles(items)).toEqual([
      `${localInstant('2026-11-21', '09:00').toISOString().slice(0, 16)} Tu período llega en 2 días`,
      `${localInstant('2026-11-22', '09:00').toISOString().slice(0, 16)} Tu período llega en 1 día`,
      `${localInstant('2026-11-23', '09:00').toISOString().slice(0, 16)} Tu período podría llegar hoy`,
      `${localInstant('2026-11-24', '12:00').toISOString().slice(0, 16)} Período atrasado`,
      `${localInstant('2026-11-25', '12:00').toISOString().slice(0, 16)} Período atrasado`,
      `${localInstant('2026-11-26', '12:00').toISOString().slice(0, 16)} Período atrasado`,
    ]);
  });

  it('no programa nada que ya pasó (hoy a las 09:00 ya pasó)', () => {
    const items = buildSchedule(self({ pill: { on: true, time: '08:00' } }), NOW, '2026-11-20');
    expect(items.every((i) => i.sendAt > NOW)).toBe(true);
    expect(items.filter((i) => i.payload.title.includes('píldora'))).toHaveLength(6); // mañana a 6 días después
  });

  it('píldora: si ya la tomó hoy, no se avisa hoy', () => {
    const pill = { pill: { on: true, time: '21:00' } };
    const pills = (logs) => buildSchedule(self(pill, logs), NOW, '2026-11-20').filter((i) => i.payload.tag.startsWith('pill:'));
    expect(pills({})).toHaveLength(7);
    expect(pills({ '2026-11-20': { pill: true } })).toHaveLength(6);
  });

  it('cada aviso tiene un tag único (iOS reemplaza notificaciones con el mismo tag)', () => {
    const items = buildSchedule(self({ pill: { on: true, time: '21:00' } }), NOW, '2026-11-20');
    expect(new Set(items.map((i) => i.payload.tag)).size).toBe(items.length);
  });

  it('pareja: avisos del ciclo de ella, sin los momentos (esos van al instante)', () => {
    const her = { ...self({}), sharing: { name: 'Ana', shares: DEFAULT_SHARES, moments: [{ id: 'sad', at: '2026-11-20T09:00:00Z' }], desire: null } };
    const snap = buildSnapshot(her, new Date('2026-11-20T10:00:00Z'));
    const items = buildSchedule({ role: 'partner', partner: { snapshot: snap, prefs: DEFAULT_PARTNER_PREFS } }, NOW, '2026-11-20');
    expect(items.map((i) => i.payload.title)).toEqual([
      'El período de Ana llega en 2 días', 'El período de Ana llega en 1 día', 'El período de Ana podría llegar hoy',
    ]);
  });

  it('pareja con datos de ejemplo: no programa nada', () => {
    expect(buildSchedule({ role: 'partner', partner: { snapshot: demoSnapshot(), prefs: DEFAULT_PARTNER_PREFS } }, NOW, '2026-11-20')).toEqual([]);
  });
});
