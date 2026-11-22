import { describe, it, expect } from 'vitest';
import { formatArs, formatUsd, yearlySaving, isReturnFromCheckout, planFromServer, billingSummary } from './billing.js';

const prices = { enabled: true, trialDays: 7, monthly: { usd: 2.99, ars: 4485 }, yearly: { usd: 19.99, ars: 29985 } };

describe('suscripción Premium', () => {
  it('formatea precios en pesos y dólares', () => {
    expect(formatArs(4485)).toBe('$ 4.485');
    expect(formatArs(29985)).toBe('$ 29.985');
    expect(formatUsd(2.99)).toBe('USD 2,99');
  });

  it('calcula el ahorro del plan anual', () => {
    expect(yearlySaving(prices)).toBe(44);
  });

  it('detecta la vuelta desde Mercado Pago', () => {
    expect(isReturnFromCheckout({ hash: '#premium', search: '' })).toBe(true);
    expect(isReturnFromCheckout({ hash: '#premium?preapproval_id=1', search: '' })).toBe(true);
    expect(isReturnFromCheckout({ hash: '', search: '?preapproval_id=2c93' })).toBe(true);
    expect(isReturnFromCheckout({ hash: '#invitacion-AB', search: '' })).toBe(false);
  });

  it('con pagos apagados no cambia el plan (demo); con pagos prendidos manda el servidor', () => {
    expect(planFromServer({ enabled: false }, null)).toBeNull();
    expect(planFromServer(prices, null)).toEqual({ plan: 'free', billing: null });
    expect(planFromServer(prices, { plan: 'premium', status: 'authorized', period: 'MONTHLY', nextPaymentAt: '2026-12-22T12:00:00Z', amountArs: 4485 }))
      .toEqual({ plan: 'premium', billing: { status: 'authorized', period: 'MONTHLY', nextPaymentAt: '2026-12-22T12:00:00Z', amountArs: 4485 } });
  });

  it('resume el estado en castellano', () => {
    const fmt = () => '22 de diciembre';
    expect(billingSummary({ status: 'authorized', period: 'YEARLY', nextPaymentAt: 'x' }, fmt)).toBe('Plan anual · se renueva el 22 de diciembre');
    expect(billingSummary({ status: 'cancelled', period: 'MONTHLY', nextPaymentAt: 'x' }, fmt)).toBe('Cancelada · tenés Premium hasta el 22 de diciembre');
    expect(billingSummary(null, fmt)).toBeNull();
  });
});
