import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { groupPeriods, predictCycles, cycleSummary, averages } from '../lib/cycle.js';
import { todayISO } from '../lib/dates.js';
import { hasFeature, PREDICTION_MONTHS } from './plans.js';

const STORAGE_KEY = 'mydays:v1';

const initialState = {
  onboarded: false,
  periodDays: [], // ['2026-11-01', ...]
  logs: {}, // { '2026-11-01': { flow, symptoms: [], mood, note } }
  settings: { cycleLength: 28, periodLength: 5, theme: 'system', pin: null },
  plan: 'free', // 'free' | 'premium'  (en producción esto lo valida el servidor)
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw);
    return { ...initialState, ...saved, settings: { ...initialState.settings, ...saved.settings } };
  } catch {
    return initialState;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* modo privado o almacenamiento lleno: seguimos en memoria */
    }
  }, [state]);

  const derived = useMemo(() => {
    const today = todayISO();
    const periods = groupPeriods(state.periodDays);
    const months = PREDICTION_MONTHS[state.plan];
    const avg = averages(periods, state.settings);
    const count = Math.max(1, Math.round((months * 30.4) / avg.cycleLength));
    return {
      today,
      periods,
      averages: avg,
      predictions: predictCycles(periods, state.settings, today, count),
      summary: cycleSummary(periods, state.settings, today),
      can: (feature) => hasFeature(state.plan, feature),
    };
  }, [state]);

  const actions = useMemo(() => ({
    update: (patch) => setState((s) => ({ ...s, ...patch })),
    updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    setPeriodDays: (periodDays) => setState((s) => ({ ...s, periodDays })),
    saveLog: (date, log) => setState((s) => {
      const logs = { ...s.logs };
      const empty = !log.flow && !log.mood && !log.note && !(log.symptoms?.length);
      if (empty) delete logs[date];
      else logs[date] = log;
      return { ...s, logs };
    }),
    reset: () => setState({ ...initialState }),
  }), []);

  return (
    <StoreContext.Provider value={{ state, ...derived, ...actions }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return ctx;
}
