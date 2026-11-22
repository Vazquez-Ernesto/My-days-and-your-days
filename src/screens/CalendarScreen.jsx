import { useState } from 'react';
import { MonthGrid, YearGrid, Legend } from '../components/Calendar.jsx';
import Header from '../components/Header.jsx';
import Icon from '../components/Icons.jsx';
import { useStore } from '../state/store.jsx';
import { useSwipe } from '../lib/useSwipe.js';
import { MONTHS, fromISO, diffDays, addDays } from '../lib/dates.js';
import { dayStatus, cycleDayOf, pregnancyChance } from '../lib/cycle.js';
import { dayMarkers } from '../lib/dayMarkers.js';

const STATUS = {
  period: { text: 'Día de período', cls: 'period' },
  predicted: { text: 'Período previsto', cls: 'predicted' },
  fertile: { text: 'Ventana fértil', cls: 'fertile' },
  ovulation: { text: 'Ovulación prevista', cls: 'ovulation' },
};
const CHANCE = { baja: 'Fertilidad baja', media: 'Fertilidad media', alta: 'Fertilidad alta' };
const WEEKDAY = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function relative(iso, today) {
  const d = diffDays(iso, today);
  if (d === 0) return 'Hoy';
  if (d === -1) return 'Ayer';
  if (d === 1) return 'Mañana';
  if (d < 0) return -d >= 30 ? `Hace ${Math.round(-d / 30)} mes${Math.round(-d / 30) === 1 ? '' : 'es'}` : `Hace ${-d} días`;
  return `En ${d} días`;
}

/** Tramos (inicio–fin) de un estado dentro del mes, para el resumen: "8–12". */
export function monthRanges(year, month, statusOf, wanted) {
  const ranges = [];
  let iso = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  while (fromISO(iso).getUTCMonth() === month) {
    if (wanted.includes(statusOf(iso))) {
      const last = ranges.at(-1);
      if (last && diffDays(iso, last.end) === 1) last.end = iso;
      else ranges.push({ start: iso, end: iso });
    }
    iso = addDays(iso, 1);
  }
  return ranges.map((r) => (r.start === r.end ? `${fromISO(r.start).getUTCDate()}` : `${fromISO(r.start).getUTCDate()}–${fromISO(r.end).getUTCDate()}`));
}

/** Navegación de meses con deslizamiento y animación según la dirección. */
export function useMonthNav(today) {
  const t = fromISO(today);
  const [view, setView] = useState({ y: t.getUTCFullYear(), m: t.getUTCMonth(), dir: 0 });
  const move = (delta) => setView(({ y, m }) => {
    const nm = m + delta;
    return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12, dir: delta };
  });
  const goToday = () => setView({ y: t.getUTCFullYear(), m: t.getUTCMonth(), dir: 0 });
  const swipe = useSwipe({ onLeft: () => move(1), onRight: () => move(-1) });
  return { view, setView, move, goToday, swipe };
}

export default function CalendarScreen({ onLog, onUpgrade, onSettings }) {
  const { state, today, periods, predictions, averages, togglePeriodDay, can } = useStore();
  const { view, setView, move, goToday, swipe } = useMonthNav(today);
  const [mode, setMode] = useState('month');
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState(false);

  const ctx = { periodDays: state.periodDays, periods, predictions, settings: state.settings };
  const statusOf = (iso) => dayStatus(iso, ctx);
  const pickMode = (next) => {
    if (next === 'year' && !can('yearView')) return onUpgrade();
    setMode(next);
  };
  const select = (iso) => (editing ? togglePeriodDay(iso) : setSelected(iso));
  const moveAny = (delta) => (mode === 'year' ? setView((v) => ({ ...v, y: v.y + delta, dir: delta })) : move(delta));

  const log = state.logs[selected];
  const status = STATUS[statusOf(selected)];
  const cycleDay = cycleDayOf(selected, periods, predictions);
  const chance = pregnancyChance(cycleDay, averages.cycleLength, averages.periodLength);
  const sel = fromISO(selected);

  const periodRanges = monthRanges(view.y, view.m, statusOf, ['period']);
  const fertileRanges = monthRanges(view.y, view.m, statusOf, ['fertile', 'ovulation']);
  const predictedRanges = monthRanges(view.y, view.m, statusOf, ['predicted']);

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
          <button className="icon-btn icon-btn--text" aria-label="Ir a hoy" onClick={() => { goToday(); setSelected(today); }}>Hoy</button>
        )} />

      <div className="card cal-card" {...(mode === 'month' ? swipe : {})}>
        <div className="cal__head">
          <button className="icon-btn" onClick={() => moveAny(-1)} aria-label="Anterior"><Icon name="back" /></button>
          <strong className="cal__title">{mode === 'year' ? view.y : `${MONTHS[view.m]} ${view.y}`}</strong>
          <button className="icon-btn" onClick={() => moveAny(1)} aria-label="Siguiente"><Icon name="chevron" /></button>
        </div>
        {mode === 'month' && (periodRanges.length > 0 || fertileRanges.length > 0 || predictedRanges.length > 0) && (
          <div className="cal__summary">
            {periodRanges.length > 0 && <span className="sum sum--period">Período {periodRanges.join(', ')}</span>}
            {predictedRanges.length > 0 && <span className="sum sum--predicted">Previsto {predictedRanges.join(', ')}</span>}
            {fertileRanges.length > 0 && <span className="sum sum--fertile">Fértil {fertileRanges.join(', ')}</span>}
          </div>
        )}
        <div key={`${mode}-${view.y}-${view.m}`} className={`cal__slide cal__slide--${view.dir > 0 ? 'next' : view.dir < 0 ? 'prev' : 'none'}`}>
          {mode === 'month'
            ? <MonthGrid year={view.y} month={view.m} selected={selected} editing={editing} onSelect={select} />
            : <YearGrid year={view.y} onPickMonth={(m) => { setView({ y: view.y, m, dir: 0 }); setMode('month'); }} />}
        </div>
        <Legend />
        {mode === 'month' && <p className="cal__hint muted small">Deslizá para cambiar de mes</p>}
      </div>

      {editing ? (
        <div className="card edit-hint">
          <p>Tocá los días en que tuviste el período para marcarlos o desmarcarlos.</p>
          <button className="btn btn--primary btn--small" onClick={() => setEditing(false)}>Listo</button>
        </div>
      ) : (
        <div className="card day-card">
          <div className="day-card__head">
            <span className={`day-card__num ${status ? `day-card__num--${status.cls}` : ''}`}>{sel.getUTCDate()}</span>
            <div className="grow">
              <strong>{WEEKDAY[sel.getUTCDay()]}</strong>
              <p className="muted small">{MONTHS[sel.getUTCMonth()]} · {relative(selected, today)}</p>
            </div>
          </div>
          <div className="chips">
            {status && <span className={`chip chip--${status.cls}`}>{status.text}</span>}
            {cycleDay && <span className="chip">Día del ciclo: {cycleDay}</span>}
            {!status && chance && <span className="chip">{CHANCE[chance]}</span>}
            {!status && !cycleDay && <span className="muted small">Sin datos del ciclo</span>}
          </div>
          {log && (
            <ul className="log-summary" aria-label="Registro del día">
              {dayMarkers(log).filter((m) => m.key !== 'note' && m.key !== 'partnerNote').map((m) => (
                <li key={m.key} className={`chip chip--log chip--${m.key}`}><span aria-hidden="true">{m.emoji}</span> {m.label}</li>
              ))}
              {log.partnerNote && <li className="note">💌 “{log.partnerNote}”</li>}
              {log.note && <li className="note">📝 “{log.note}”</li>}
            </ul>
          )}
          <div className="row">
            <button className="btn btn--soft" onClick={() => { setMode('month'); setEditing(true); }}>Editar período</button>
            <button className="btn btn--primary" onClick={() => onLog(selected)}>{log ? 'Editar registro' : 'Registrar'}</button>
          </div>
        </div>
      )}
    </section>
  );
}
