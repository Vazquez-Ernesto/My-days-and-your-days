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
import { formatLong, formatShort, formatWeekday, diffDays } from '../lib/dates.js';

export const CHANCE_TEXT = {
  baja: 'Baja posibilidad de quedar embarazada',
  media: 'Posibilidad media de quedar embarazada',
  alta: 'Alta posibilidad de quedar embarazada',
};

export const PHASE_SHORT = {
  menstrual: 'Período', follicular: 'Folicular', fertile: 'Fértil', ovulation: 'Ovulación', luteal: 'Lútea', late: 'Atraso',
};

/** Saludo según la hora del día. */
function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function Greeting({ name, today }) {
  return (
    <span className="hello">
      <small>{formatWeekday(today)}</small>
      <span>{greeting()}{name ? `, ${name}` : ''} 🌙</span>
    </span>
  );
}

export default function Home({ onUpgrade, onSettings, onQuiz, onLog }) {
  const { state, summary, predictions, periods, today, averages, setPeriodDays } = useStore();

  const periodStarted = () => setPeriodDays(startPeriod(state.periodDays, today, averages.periodLength));
  const periodEnded = () => setPeriodDays(endPeriod(state.periodDays, today));
  const name = state.sharing.name?.trim();

  if (!summary) {
    return (
      <section className="screen">
        <Header title={<Greeting name={name} today={today} />} onSettings={onSettings} />
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
  const next = predictions[0];
  let big, small;
  if (summary.onPeriod) { big = `Día ${summary.periodDay}`; small = 'de tu período'; }
  else if (summary.phase === 'late') { big = `${-summary.daysUntilNext}`; small = `día${summary.daysUntilNext === -1 ? '' : 's'} de atraso`; }
  else if (summary.daysUntilNext === 0) { big = 'Hoy'; small = 'podría llegar tu período'; }
  else { big = `${summary.daysUntilNext}`; small = `día${summary.daysUntilNext === 1 ? '' : 's'} para tu período`; }

  return (
    <section className="screen">
      <Header title={<Greeting name={name} today={today} />} onSettings={onSettings} />

      <ReminderBanners />

      <div className="hero">
        <CycleRing summary={summary}>
          <span className={`phase-chip phase-chip--${summary.phase}`}>{PHASE_SHORT[summary.phase]}</span>
          <span className="ring__big">{big}</span>
          <span className="ring__small">{small}</span>
          <span className="ring__day">Día {summary.cycleDay} del ciclo</span>
        </CycleRing>
        <div className="hero__actions">
          {summary.onPeriod
            ? <button className="btn btn--outline grow" onClick={periodEnded}>Terminó hoy</button>
            : <button className="btn btn--primary grow" onClick={periodStarted}>Me vino hoy</button>}
          <button className="btn btn--round" onClick={() => onLog?.(today)} aria-label="Registrar hoy">
            <Icon name="plus" strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="widgets">
        {fertile && (
          <div className="widget widget--fertile">
            <span className="widget__icon"><Icon name="egg" size={18} /></span>
            <small>Ventana fértil</small>
            <strong>{fertile.active ? 'En curso' : `En ${fertile.daysUntil} día${fertile.daysUntil === 1 ? '' : 's'}`}</strong>
            <span className="widget__sub">{formatShort(fertile.start)} – {formatShort(fertile.end)}</span>
          </div>
        )}
        {next && (
          <div className="widget widget--period">
            <span className="widget__icon"><Icon name="drop" size={18} /></span>
            <small>Próximo período</small>
            <strong>{formatShort(next.periodStart)}</strong>
            <span className="widget__sub">en {diffDays(next.periodStart, today)} días</span>
          </div>
        )}
      </div>

      <QuizCard onOpen={onQuiz} />

      <div className="card stack">
        <div className="row row--between">
          <h2 className="card__title">Tu ciclo</h2>
          <span className={`chance-pill chance-pill--${chance}`}>{chance === 'alta' ? 'Fertilidad alta' : chance === 'media' ? 'Fertilidad media' : 'Fertilidad baja'}</span>
        </div>
        <CycleTimeline summary={summary} start={periods[periods.length - 1].start} />
        <p className="muted small"><strong>{phase.label}.</strong> {phase.tip} {CHANCE_TEXT[chance]}.</p>
      </div>

      {state.sharing.shares.moments && <MomentCard />}

      <AdBanner onUpgrade={onUpgrade} />

      <div className="card">
        <h2 className="card__title">Próximos períodos</h2>
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
