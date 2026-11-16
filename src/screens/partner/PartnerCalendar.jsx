import { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { MonthGrid, Legend } from '../../components/Calendar.jsx';
import Header from '../../components/Header.jsx';
import Icon from '../../components/Icons.jsx';
import { MONTHS, fromISO, formatLong } from '../../lib/dates.js';
import { dayStatus, cycleDayOf } from '../../lib/cycle.js';
import { snapshotView } from '../../lib/partner.js';
import SharedDay from '../../components/SharedDay.jsx';

const STATUS_TEXT = { period: 'Tuvo su período', predicted: 'Período previsto', fertile: 'Ventana fértil', ovulation: 'Ovulación prevista' };

export default function PartnerCalendar({ onSettings }) {
  const { state, today } = useStore();
  const snap = state.partner.snapshot;
  const view = snapshotView(snap, today);
  const t = fromISO(today);
  const [ym, setYm] = useState({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
  const [selected, setSelected] = useState(today);
  const hideFertile = !snap.shares?.fertile;

  if (!view) {
    return (
      <section className="screen">
        <Header title="Calendario" onSettings={onSettings} />
        <div className="card center"><p className="muted">{snap.name} no comparte su ciclo por ahora.</p></div>
      </section>
    );
  }
  const data = { ...view, logs: Object.fromEntries(Object.entries(snap.days ?? {}).map(([d, v]) => [d, { ...v, note: v.partnerNote }])) };
  const move = (delta) => setYm(({ y, m }) => {
    const nm = m + delta;
    return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
  });
  let status = dayStatus(selected, view);
  if (hideFertile && (status === 'fertile' || status === 'ovulation')) status = null;
  const cycleDay = cycleDayOf(selected, view.periods, view.predictions);

  return (
    <section className="screen">
      <Header title={`Calendario de ${snap.name}`} onSettings={onSettings} />
      <div className="card">
        <div className="cal__head">
          <button className="icon-btn" onClick={() => move(-1)} aria-label="Anterior"><Icon name="back" /></button>
          <strong>{MONTHS[ym.m]} {ym.y}</strong>
          <button className="icon-btn" onClick={() => move(1)} aria-label="Siguiente"><Icon name="chevron" /></button>
        </div>
        <MonthGrid year={ym.y} month={ym.m} selected={selected} onSelect={setSelected} data={data} hideFertile={hideFertile} />
        <Legend hideFertile={hideFertile} />
      </div>
      <div className="card day-detail">
        <div className="row row--between">
          <strong>{formatLong(selected)}</strong>
          {cycleDay && <span className="muted small">Día del ciclo: {cycleDay}</span>}
        </div>
        <p className="muted">{STATUS_TEXT[status] ?? 'Sin eventos'}</p>
        <SharedDay day={snap.days?.[selected]} name={snap.name} />
      </div>
    </section>
  );
}
