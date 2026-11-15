import { LUTEAL_PHASE } from '../lib/cycle.js';
import { formatShort } from '../lib/dates.js';

/** Barra horizontal con las fases del ciclo actual y un marcador en el día de hoy. */
export default function CycleTimeline({ summary, start }) {
  const { cycleLength: len, periodLength: pl, cycleDay } = summary;
  const ov = len - LUTEAL_PHASE + 1;
  const total = Math.max(len, cycleDay);
  const pct = (days) => `${(days / total) * 100}%`;
  const segments = [
    { cls: 'period', days: pl },
    { cls: 'follicular', days: Math.max(0, ov - 6 - pl) },
    { cls: 'fertile', days: 7 },
    { cls: 'luteal', days: Math.max(0, len - (ov + 1)) },
  ];
  if (total > len) segments.push({ cls: 'late', days: total - len });
  return (
    <div className="timeline">
      <div className="timeline__labels"><span>{formatShort(start)}</span><span>Día {len}</span></div>
      <div className="timeline__bar" role="img" aria-label={`Día ${cycleDay} de ${len}`}>
        {segments.map((s, i) => <span key={i} className={`tl tl--${s.cls}`} style={{ width: pct(s.days) }} />)}
        <i className="timeline__ov" style={{ left: pct(ov - 0.5) }} title="Ovulación" />
        <i className="timeline__today" style={{ left: pct(Math.min(cycleDay, total) - 0.5) }} />
      </div>
      <div className="timeline__legend">
        <span><i className="tl--period" />Período</span>
        <span><i className="tl--fertile" />Fértil</span>
        <span><i className="tl--luteal" />Lútea</span>
      </div>
    </div>
  );
}
