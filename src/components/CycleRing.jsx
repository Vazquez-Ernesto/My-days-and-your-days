import { LUTEAL_PHASE } from '../lib/cycle.js';

// Anillo SVG: cada segmento es un día del ciclo, coloreado según la fase.
export default function CycleRing({ summary, children, hideFertile = false }) {
  const size = 260;
  const r = 110;
  const c = size / 2;
  const total = Math.max(summary.cycleLength, summary.cycleDay);
  const ovulation = summary.cycleLength - LUTEAL_PHASE + 1;
  const gap = 0.012;

  const segments = Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    let cls = 'seg';
    if (day <= summary.periodLength) cls += ' seg--period';
    else if (!hideFertile && day === ovulation) cls += ' seg--ovulation';
    else if (!hideFertile && day >= ovulation - 5 && day <= ovulation + 1) cls += ' seg--fertile';
    if (day > summary.cycleLength) cls += ' seg--late';
    const a0 = (i / total) * 2 * Math.PI - Math.PI / 2 + gap;
    const a1 = ((i + 1) / total) * 2 * Math.PI - Math.PI / 2 - gap;
    const d = `M ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
    return <path key={day} d={d} className={cls} />;
  });

  const angle = ((summary.cycleDay - 0.5) / total) * 2 * Math.PI - Math.PI / 2;
  return (
    <div className="ring">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Día ${summary.cycleDay} del ciclo`}>
        {segments}
        <circle cx={c + r * Math.cos(angle)} cy={c + r * Math.sin(angle)} r="13" className="ring__marker" />
      </svg>
      <div className="ring__center">{children}</div>
    </div>
  );
}
