import { useStore } from '../state/store.jsx';
import CycleRing from '../components/CycleRing.jsx';
import { AdBanner } from '../components/Premium.jsx';
import { PHASES, startPeriod, endPeriod } from '../lib/cycle.js';
import { formatLong, diffDays } from '../lib/dates.js';

export default function Home({ onLog, onUpgrade }) {
  const { state, summary, predictions, today, averages, setPeriodDays, reminders } = useStore();

  const periodStarted = () => setPeriodDays(startPeriod(state.periodDays, today, averages.periodLength));
  const periodEnded = () => setPeriodDays(endPeriod(state.periodDays, today));

  if (!summary) {
    return (
      <section className="screen">
        <div className="card center">
          <p>Todavía no hay períodos registrados.</p>
          <button className="btn btn--primary" onClick={periodStarted}>Me vino hoy</button>
        </div>
      </section>
    );
  }

  const phase = PHASES[summary.phase];
  let big, small;
  if (summary.onPeriod) { big = `Día ${summary.periodDay}`; small = 'de tu período'; }
  else if (summary.phase === 'late') { big = `${-summary.daysUntilNext}`; small = `día${summary.daysUntilNext === -1 ? '' : 's'} de atraso`; }
  else if (summary.daysUntilNext === 0) { big = 'Hoy'; small = 'podría llegar tu período'; }
  else { big = `${summary.daysUntilNext}`; small = `día${summary.daysUntilNext === 1 ? '' : 's'} para tu período`; }

  return (
    <section className="screen">
      <header className="screen__head">
        <p className="muted">{formatLong(today)}</p>
        <h1>Hola 🌙</h1>
      </header>

      {reminders.map((r) => (
        <div key={r.id} className="card reminder" role="status">
          <span className="reminder__icon">🔔</span>
          <div><strong>{r.title}</strong><p className="muted small">{r.body}</p></div>
        </div>
      ))}

      <CycleRing summary={summary}>
        <span className="ring__big">{big}</span>
        <span className="ring__small">{small}</span>
        <span className="ring__day">Día {summary.cycleDay} del ciclo</span>
      </CycleRing>

      <div className="row">
        {summary.onPeriod
          ? <button className="btn btn--outline" onClick={periodEnded}>Terminó hoy</button>
          : <button className="btn btn--primary" onClick={periodStarted}>Me vino hoy</button>}
        <button className="btn btn--outline" onClick={() => onLog(today)}>Registrar día</button>
      </div>

      <div className={`card phase phase--${summary.phase}`}>
        <strong>{phase.label}</strong>
        <p>{phase.tip}</p>
      </div>

      <AdBanner onUpgrade={onUpgrade} />

      <div className="card">
        <h3>Próximos períodos</h3>
        <ul className="list">
          {predictions.slice(0, 3).map((p) => (
            <li key={p.periodStart}>
              <span>{formatLong(p.periodStart)}</span>
              <span className="muted">en {diffDays(p.periodStart, today)} días</span>
            </li>
          ))}
        </ul>
        <p className="disclaimer">Las predicciones son estimaciones y no sirven como método anticonceptivo.</p>
      </div>
    </section>
  );
}
