import { useStore } from '../state/store.jsx';
import CycleRing from '../components/CycleRing.jsx';
import CycleTimeline from '../components/CycleTimeline.jsx';
import ReminderBanners from '../components/ReminderBanner.jsx';
import MomentCard from '../components/MomentCard.jsx';
import QuizCard from '../components/QuizCard.jsx';
import Header from '../components/Header.jsx';
import Icon from '../components/Icons.jsx';
import { AdBanner } from '../components/Premium.jsx';
import { PHASES, startPeriod, endPeriod, pregnancyChance, nextFertileWindow } from '../lib/cycle.js';
import { formatLong, formatShort, diffDays } from '../lib/dates.js';

export const CHANCE_TEXT = {
  baja: 'Baja posibilidad de quedar embarazada',
  media: 'Posibilidad media de quedar embarazada',
  alta: 'Alta posibilidad de quedar embarazada',
};

export default function Home({ onUpgrade, onSettings, onQuiz }) {
  const { state, summary, predictions, periods, today, averages, setPeriodDays } = useStore();

  const periodStarted = () => setPeriodDays(startPeriod(state.periodDays, today, averages.periodLength));
  const periodEnded = () => setPeriodDays(endPeriod(state.periodDays, today));

  if (!summary) {
    return (
      <section className="screen">
        <Header title={formatShort(today)} onSettings={onSettings} />
        <div className="card center stack">
          <p>Todavía no hay períodos registrados.</p>
          <button className="btn btn--primary" onClick={periodStarted}>Me vino hoy</button>
        </div>
      </section>
    );
  }

  const phase = PHASES[summary.phase];
  const chance = pregnancyChance(summary.cycleDay, summary.cycleLength, summary.periodLength);
  const fertile = nextFertileWindow(periods, state.settings, predictions, today);
  let big, small;
  if (summary.onPeriod) { big = `Día ${summary.periodDay}`; small = 'de tu período'; }
  else if (summary.phase === 'late') { big = `${-summary.daysUntilNext}`; small = `día${summary.daysUntilNext === -1 ? '' : 's'} de atraso`; }
  else if (summary.daysUntilNext === 0) { big = 'Hoy'; small = 'podría llegar tu período'; }
  else { big = `${summary.daysUntilNext}`; small = `día${summary.daysUntilNext === 1 ? '' : 's'} para tu período`; }

  return (
    <section className="screen">
      <Header title={formatShort(today)} onSettings={onSettings} />

      <ReminderBanners />

      <CycleRing summary={summary}>
        <span className="ring__big">{big}</span>
        <span className="ring__small">{small}</span>
        <span className="ring__day">Día {summary.cycleDay} del ciclo</span>
      </CycleRing>

      {summary.onPeriod
        ? <button className="btn btn--outline btn--wide" onClick={periodEnded}>Terminó hoy</button>
        : <button className="btn btn--primary btn--wide" onClick={periodStarted}>Me vino hoy</button>}

      <div className="card stack">
        <div>
          <h2 className="card__title">Hoy · Día del ciclo: {summary.cycleDay}</h2>
          <p className={`chance chance--${chance}`}>{CHANCE_TEXT[chance]}</p>
        </div>
        <CycleTimeline summary={summary} start={periods[periods.length - 1].start} />
        <p className="muted small"><strong>{phase.label}.</strong> {phase.tip}</p>
      </div>

      <QuizCard onOpen={onQuiz} />

      {state.sharing.shares.moments && <MomentCard />}

      {fertile && (
        <div className="card info-row">
          <span className="info-row__icon info-row__icon--fertile"><Icon name="egg" /></span>
          <div className="grow">
            <h3>Ventana fértil</h3>
            <strong>
              {fertile.active ? 'En curso' : `Falta${fertile.daysUntil === 1 ? '' : 'n'} ${fertile.daysUntil} día${fertile.daysUntil === 1 ? '' : 's'}`}
            </strong>
            <p className="muted small">{formatShort(fertile.start)} – {formatShort(fertile.end)} · ovulación {formatShort(fertile.ovulation)}</p>
          </div>
        </div>
      )}

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
