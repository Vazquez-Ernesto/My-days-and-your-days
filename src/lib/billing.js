// Suscripción a Premium con Mercado Pago. El servidor le pregunta el estado a Mercado Pago;
// la app solo muestra lo que dice el servidor.

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 4485 → "$ 4.485" */
export const formatArs = (n) => ars.format(Number(n)).replace(/ /g, ' ');
/** 2.99 → "USD 2,99" */
export const formatUsd = (n) => `USD ${usd.format(Number(n))}`;

/** Precio mensual equivalente del plan anual, para mostrar el ahorro. */
export function yearlySaving(prices) {
  const monthly = Number(prices.monthly.usd);
  const yearly = Number(prices.yearly.usd);
  if (!monthly || !yearly) return 0;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

/** ¿Volvemos de pagar en Mercado Pago? (back_url = ...#premium; Mercado Pago puede sumar ?preapproval_id=...) */
export function isReturnFromCheckout(loc = window.location) {
  return loc.hash.startsWith('#premium') || new URLSearchParams(loc.search).has('preapproval_id');
}

/**
 * Traduce la respuesta del servidor al estado que guarda la app.
 * Si los pagos no están habilitados, no tocamos el plan (modo demo).
 */
export function planFromServer(prices, me) {
  if (!prices?.enabled) return null;
  return {
    plan: me?.plan === 'premium' ? 'premium' : 'free',
    billing: me?.status
      ? { status: me.status, period: me.period, nextPaymentAt: me.nextPaymentAt, amountArs: me.amountArs }
      : null,
  };
}

/** Texto del estado de la suscripción para Ajustes y la pantalla de planes. */
export function billingSummary(billing, formatDate) {
  if (!billing) return null;
  const when = billing.nextPaymentAt ? formatDate(billing.nextPaymentAt) : null;
  const period = billing.period === 'YEARLY' ? 'anual' : 'mensual';
  switch (billing.status) {
    case 'authorized': return when ? `Plan ${period} · se renueva el ${when}` : `Plan ${period} activo`;
    case 'cancelled': return when ? `Cancelada · tenés Premium hasta el ${when}` : 'Suscripción cancelada';
    case 'paused': return 'Suscripción pausada en Mercado Pago';
    case 'pending': return 'Esperando la confirmación de Mercado Pago';
    default: return null;
  }
}
