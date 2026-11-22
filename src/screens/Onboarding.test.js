import { describe, it, expect } from 'vitest';
import { nextPeriodFrom } from './Onboarding.jsx';

describe('vista previa de la bienvenida', () => {
  it('suma ciclos hasta pasar hoy', () => {
    expect(nextPeriodFrom('2026-11-10', 29, '2026-11-20')).toBe('2026-12-09');
    expect(nextPeriodFrom('2026-09-01', 28, '2026-11-20')).toBe('2026-11-24'); // 3 ciclos después
  });
  it('si el período empezó hoy, el próximo es en un ciclo', () => {
    expect(nextPeriodFrom('2026-11-20', 28, '2026-11-20')).toBe('2026-12-18');
  });
});
