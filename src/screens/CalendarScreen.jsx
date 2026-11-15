import { useState } from 'react';
import { MonthGrid, YearGrid, Legend } from '../components/Calendar.jsx';
import Header from '../components/Header.jsx';
import Icon from '../components/Icons.jsx';
import { useStore } from '../state/store.jsx';
import { MONTHS, fromISO, diffDays, formatLong } from '../lib/dates.js';
import { dayStatus, cycleDayOf, pregnancyChance } from '../lib/cycle.js';
import { MOODS, FLOWS, SEX } from '../components/DayLogSheet.jsx';
import { CHANCE_TEXT } from './Home.jsx';

const STATUS_TEXT = {
  period: 'Día de período', predicted: 'Período previsto', fertile: 'Ventana fértil', ovulation: 'Ovulación prevista',
};

function relative(iso, today) {
  const d = diffDays(iso, today);
  if (d === 0) return 'Hoy';
  if (d === -1) return 'Ayer';
  if (d === 1) return 'Mañana';
  if (d < 0) return -d >= 30 ? `Hace ${Math.round(-d / 30)} mes${Math.round(-d / 30) === 1 ? '' : 'es'}` : `Hace ${-d} días`;
  return `En ${d} días`;
}

export default function CalendarScreen({ onLog, onUpgrade, onSettings }) {
  const { state, today, periods, predictions, averages, togglePeriodDay, can } = useStore();
  const t = fromISO(today);
  const [view, setView] = useState({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
  const [mode, setMode] = useState('month');
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState(false);

  const move = (delta) => setView(({ y, m }) => {
    if (mode === 'year') return { y: y + delta, m };
    const nm = m + delta;
    return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
  });
  const pickMode = (next) => {
    if (next === 'year' && !can('yearView')) return onUpgrade();
    setMode(next);
  };
  const select = (iso) => (editing ? togglePeriodDay(iso) : setSelected(iso));

  const log = state.logs[selected];
  const status = dayStatus(selected, { periodDays: state.periodDays, periods, predictions, settings: state.settings });
  const cycleDay = cycleDayOf(selected, periods, predictions);
  const chance = pregnancyChance(cycleDay, averages.cycleLength, averages.periodLength);
  const mood = MOODS.find((m) => m.id === log?.mood);

  return (
    <section className="screen">
      <Header onSettings={onSettings}
        title={(
          <span className="segmented segmented--small" role="tablist">
            <button role="tab" aria-selected={mode === 'month'} className={mode === 'month' ? 'is-on' : ''} onClick={() => pickMode('month')}>Mes</button>
            <button role="tab" aria-selected={mode === 'year'} className={mode === 'year' ? 'is-on' : ''} onClick={() => pickMode('year')}>Año</button>
          </span>
        )}
        right={(
          <button className="icon-btn icon-btn--text" aria-label="Ir a hoy"
            onClick={() => { setView({ y: t.getUTCFullYear(), m: t.getUTCMonth() }); setSelected(today); }}>Hoy</button>
        )} />

      <div className="card">
        <div className="cal__head">
          <button className="icon-btn" onClick={() => move(-1)} aria-label="Anterior"><Icon name="back" /></button>
          <strong>{mode === 'year' ? view.y : `${MONTHS[view.m]} ${view.y}`}</strong>
          <button className="icon-btn" onClick={() => move(1)} aria-label="Siguiente"><Icon name="chevron" /></button>
        </div>
        {mode === 'month'
          ? <MonthGrid year={view.y} month={view.m} selected={selected} editing={editing} onSelect={select} />
          : <YearGrid year={view.y} onPickMonth={(m) => { setView({ y: view.y, m }); setMode('month'); }} />}
        <Legend />
      </div>

      {editing ? (
        <div className="card edit-hint">
          <p>Tocá los días en que tuviste el período para marcarlos o desmarcarlos.</p>
          <button className="btn btn--primary btn--small" onClick={() => setEditing(false)}>Listo</button>
        </div>
      ) : (
        <div className="row">
          <button className="btn btn--soft" onClick={() => { setMode('month'); setEditing(true); }}>Editar período</button>
          <button className="btn btn--soft" onClick={() => onLog(selected)}>{log ? 'Editar registro' : 'Registrar'}</button>
        </div>
      )}

      {!editing && (
        <div className="card day-detail">
          <div className="row row--between">
            <strong>{relative(selected, today)} · {formatLong(selected)}</strong>
            {cycleDay && <span className="muted small">Día del ciclo: {cycleDay}</span>}
          </div>
          <p className="muted">{STATUS_TEXT[status] ?? (chance ? CHANCE_TEXT[chance] : 'Sin datos del ciclo')}</p>
          {log && (
            <div className="log-summary">
              {log.flow && <span className="chip is-on">{FLOWS.find((f) => f.id === log.flow)?.label}</span>}
              {mood && <span className="chip">{mood.emoji} {mood.label}</span>}
              {log.sex && <span className="chip">♥ {SEX.find((s) => s.id === log.sex)?.label}</span>}
              {log.symptoms.map((s) => <span key={s} className="chip">{s}</span>)}
              {log.weight && <span className="chip">{log.weight} kg</span>}
              {log.temp && <span className="chip">{log.temp} °C</span>}
              {log.pill && <span className="chip">💊 Píldora</span>}
              {log.note && <p className="note">“{log.note}”</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
