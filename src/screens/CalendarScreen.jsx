import { useState } from 'react';
import Calendar from '../components/Calendar.jsx';
import { useStore } from '../state/store.jsx';
import { formatLong } from '../lib/dates.js';
import { dayStatus } from '../lib/cycle.js';
import { MOODS, FLOWS } from '../components/DayLogSheet.jsx';

const STATUS_TEXT = {
  period: 'Día de período', predicted: 'Período previsto', fertile: 'Ventana fértil', ovulation: 'Ovulación prevista',
};

export default function CalendarScreen({ onLog }) {
  const { state, today, periods, predictions } = useStore();
  const [selected, setSelected] = useState(today);
  const log = state.logs[selected];
  const status = dayStatus(selected, { periodDays: state.periodDays, periods, predictions, settings: state.settings });

  return (
    <section className="screen">
      <header className="screen__head"><h1>Calendario</h1></header>
      <Calendar selected={selected} onSelect={setSelected} />
      <div className="card">
        <div className="row row--between">
          <div>
            <strong>{formatLong(selected)}</strong>
            <p className="muted">{STATUS_TEXT[status] ?? 'Sin eventos'}</p>
          </div>
          <button className="btn btn--primary btn--small" onClick={() => onLog(selected)}>
            {log ? 'Editar' : 'Registrar'}
          </button>
        </div>
        {log && (
          <div className="log-summary">
            {log.flow && <span className="chip is-on">{FLOWS.find((f) => f.id === log.flow)?.label}</span>}
            {log.mood && <span className="chip">{MOODS.find((m) => m.id === log.mood)?.emoji} {MOODS.find((m) => m.id === log.mood)?.label}</span>}
            {log.symptoms.map((s) => <span key={s} className="chip">{s}</span>)}
            {log.note && <p className="note">“{log.note}”</p>}
          </div>
        )}
      </div>
    </section>
  );
}
