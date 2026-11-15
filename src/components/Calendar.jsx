import { useState } from 'react';
import { monthMatrix, MONTHS, WEEKDAYS, fromISO } from '../lib/dates.js';
import { dayStatus } from '../lib/cycle.js';
import { useStore } from '../state/store.jsx';

export default function Calendar({ onSelect, selected }) {
  const { state, periods, predictions, today } = useStore();
  const t = fromISO(today);
  const [view, setView] = useState({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
  const ctx = { periodDays: state.periodDays, periods, predictions, settings: state.settings };

  const move = (delta) => setView(({ y, m }) => {
    const nm = m + delta;
    return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
  });

  return (
    <div className="cal card">
      <div className="cal__head">
        <button className="icon-btn" onClick={() => move(-1)} aria-label="Mes anterior">‹</button>
        <strong>{MONTHS[view.m]} {view.y}</strong>
        <button className="icon-btn" onClick={() => move(1)} aria-label="Mes siguiente">›</button>
      </div>
      <div className="cal__grid">
        {WEEKDAYS.map((w) => <span key={w} className="cal__wd">{w}</span>)}
        {monthMatrix(view.y, view.m).flat().map((iso) => {
          const status = dayStatus(iso, ctx);
          const outside = fromISO(iso).getUTCMonth() !== view.m;
          const cls = ['cal__day',
            status && `is-${status}`,
            outside && 'is-outside',
            iso === today && 'is-today',
            iso === selected && 'is-selected',
          ].filter(Boolean).join(' ');
          return (
            <button key={iso} className={cls} onClick={() => onSelect(iso)} aria-label={iso}>
              {fromISO(iso).getUTCDate()}
              {state.logs[iso] && <i className="cal__dot" />}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span><i className="lg lg--period" />Período</span>
        <span><i className="lg lg--predicted" />Previsto</span>
        <span><i className="lg lg--fertile" />Fértil</span>
        <span><i className="lg lg--ovulation" />Ovulación</span>
      </div>
    </div>
  );
}
