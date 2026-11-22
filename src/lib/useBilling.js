import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { api } from './api.js';
import { API_URL } from './config.js';
import { isReturnFromCheckout, planFromServer } from './billing.js';

const REFRESH_MS = 5 * 60_000;

/**
 * Mantiene el plan sincronizado con el servidor:
 * al abrir la app, al volver a ella y al regresar de pagar en Mercado Pago.
 * Devuelve { returning } = true mientras esperamos que Mercado Pago confirme el pago.
 */
export function useBilling(enabled) {
  const { state, update } = useStore();
  const token = state.cloud.token;
  const [returning, setReturning] = useState(() => enabled && Boolean(API_URL) && isReturnFromCheckout());
  const last = useRef(0);

  const refresh = useCallback(async () => {
    if (!API_URL) return null;
    last.current = Date.now();
    try {
      const prices = await api.getPrices();
      const me = prices.enabled && token ? await api.myBilling(token) : null;
      const next = planFromServer(prices, me);
      if (next) update(next);
      return next;
    } catch {
      return null; // sin conexión: seguimos con el último plan conocido
    }
  }, [token, update]);

  useEffect(() => {
    if (!enabled) return undefined;
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last.current > REFRESH_MS) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, refresh]);

  // Al volver de Mercado Pago, la confirmación puede tardar unos segundos: preguntamos varias veces.
  useEffect(() => {
    if (!returning) return undefined;
    history.replaceState(null, '', window.location.pathname);
    let cancelled = false;
    let timer;
    // reintenta cada 2,5 s, hasta 6 veces, hasta que el servidor confirme Premium
    const attempt = (n) => refresh().then((next) => {
      if (cancelled) return;
      if (next?.plan === 'premium' || n >= 5) setReturning(false);
      else timer = setTimeout(() => { void attempt(n + 1); }, 2500);
    });
    void attempt(0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [returning, refresh]);

  return { returning, refresh };
}
