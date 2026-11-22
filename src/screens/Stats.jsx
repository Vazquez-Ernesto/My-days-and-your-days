import { useMemo, useState } from 'react';
import { useStore } from '../state/store.jsx';
import Header from '../components/Header.jsx';
import Mascot from '../components/Mascot.jsx';
import { PremiumGate } from '../components/Premium.jsx';
import { LineChart, ColumnChart, Heatmap, RankedBars, DataTable } from '../components/Charts.jsx';
import { SYMPTOM_EMOJI, MOODS } from '../components/DayLogSheet.jsx';
import { cycleDayOf, phaseOfDay } from '../lib/cycle.js';
import { cycleHistory, regularity, symptomsByPhase, moodCounts, PHASES, TYPICAL_CYCLE } from '../lib/stats.js';
import { addDays, formatShort, formatLong } from '../lib/dates.js';

const RANGES = [{ months: 3, label: '3 meses' }, { months: 6, label: '6 meses' }, { months: 12, label: '12 meses' }, { months: 0, label: 'Todo' }];

function Regularity({ reg }) {
  if (reg.status === 'few') {
    return (
      <p className="reg reg--few">
        <span aria-hidden="true">⏳</span>
        <span>Registrá {3 - reg.count} período{3 - reg.count === 1 ? '' : 's'} más para saber si tu ciclo es regular.</span>
      </p>
    );
  }
  const ok = reg.status === 'regular';
  return (
    <p className={`reg reg--${reg.status}`}>
      <span aria-hidden="true">{ok ? '✅' : '〰️'}</span>
      <span>
        <strong>{ok ? 'Regular' : 'Varía bastante'}</strong>: tus últimos {reg.count} ciclos duraron entre {reg.min} y {reg.max} días
        {ok ? '.' : '. Es común (estrés, viajes, cambios de peso); si te preocupa, consultalo con tu médica/o.'}
      </span>
    </p>
  );
}

export default function Stats({ onBack, onUpgrade }) {
  const { state, periods, predictions, averages, today } = useStore();
  const [range, setRange] = useState(6);
  const from = range ? addDays(today, -Math.round(range * 30.4)) : '0000-00-00';

  const history = useMemo(() => cycleHistory(periods), [periods]);
  const reg = regularity(history);
  const shown = history.filter((c) => c.start >= from).slice(-12);

  const phaseOf = (d) => phaseOfDay(cycleDayOf(d, periods, predictions), averages.cycleLength, averages.periodLength);
  const byPhase = useMemo(() => symptomsByPhase(state.logs, phaseOf, { from }), [state.logs, from, periods, predictions, averages]); // eslint-disable-line react-hooks/exhaustive-deps
  const moods = moodCounts(state.logs, from);

  const cyclePoints = shown.map((c) => ({
    key: c.start, x: formatShort(c.start), y: c.length, label: `Ciclo del ${formatLong(c.start)}: ${c.length} días`,
  }));
  const periodBars = shown.map((c) => ({
    key: c.start, x: formatShort(c.start), y: c.periodLength, label: `Período del ${formatLong(c.start)}: ${c.periodLength} días`,
  }));

  return (
    <section className="screen">
      <Header title="Estadísticas" onBack={onBack} />

      <div className="card stack">
        <h2 className="card__title">Tu ciclo en números</h2>
        <div className="tiles">
          <div className="tile tile--cycle"><span className="tile__n">{averages.cycleLength} días</span><span>Ciclo promedio</span></div>
          <div className="tile tile--period"><span className="tile__n">{averages.periodLength} días</span><span>Período promedio</span></div>
        </div>
        <Regularity reg={reg} />
      </div>

      <fieldset className="filters">
        <legend className="visually-hidden">Período de tiempo</legend>
        {RANGES.map((r) => (
          <button key={r.months} type="button" className={`chip ${range === r.months ? 'is-on' : ''}`} aria-pressed={range === r.months}
            onClick={() => setRange(r.months)}>{r.label}</button>
        ))}
      </fieldset>

      <PremiumGate feature="advancedStats" title="Gráficos de tu ciclo" onUpgrade={onUpgrade}>
        <div className="card stack">
          <div>
            <h2 className="card__title">Largo de tus ciclos</h2>
            <p className="muted small">Días de un período al siguiente. La franja gris es el rango típico ({TYPICAL_CYCLE.min}–{TYPICAL_CYCLE.max} días).</p>
          </div>
          {cyclePoints.length === 0 ? (
            <div className="empty"><Mascot mood="wait" size={64} /><p className="muted">Todavía no hay ciclos completos en este período.</p></div>
          ) : (
            <>
              <LineChart title="Largo de tus ciclos" points={cyclePoints} unit="d"
                band={{ ...TYPICAL_CYCLE, label: 'Típico' }} />
              <DataTable caption="Largo de tus ciclos" columns={['Inicio', 'Días']} rows={shown.map((c) => [formatLong(c.start), c.length])} />
            </>
          )}
        </div>

        <div className="card stack">
          <div>
            <h2 className="card__title">Duración de tus períodos</h2>
            <p className="muted small">Cuántos días te vino cada vez.</p>
          </div>
          {periodBars.length === 0 ? <p className="muted">Todavía no hay períodos completos en este período.</p> : (
            <>
              <ColumnChart title="Duración de tus períodos" bars={periodBars} unit="d" />
              <DataTable caption="Duración de tus períodos" columns={['Inicio', 'Días']} rows={shown.map((c) => [formatLong(c.start), c.periodLength])} />
            </>
          )}
        </div>

        <div className="card stack">
          <div>
            <h2 className="card__title">¿En qué fase aparece cada síntoma?</h2>
            <p className="muted small">De todas las veces que registraste cada síntoma, qué parte fue en cada fase.</p>
          </div>
          {byPhase.length === 0 ? (
            <div className="empty"><Mascot mood="sleepy" size={64} /><p className="muted">No hay síntomas registrados en este período.</p></div>
          ) : (
            <>
              <Heatmap caption="Síntomas por fase del ciclo (porcentaje de veces)" columns={PHASES}
                rows={byPhase.map((r) => ({ key: r.symptom, label: <><span aria-hidden="true">{SYMPTOM_EMOJI[r.symptom] ?? '•'}</span> {r.symptom}</>, values: r.pct }))} />
              <p className="small">
                <strong>{byPhase[0].symptom}</strong> aparece más en la fase <strong>{PHASES.find((p) => p.id === byPhase[0].peak).label.toLowerCase()}</strong> ({byPhase[0].pct[byPhase[0].peak]}% de las veces).
              </p>
            </>
          )}
        </div>

        <div className="card stack">
          <h2 className="card__title">Cómo te sentiste</h2>
          {moods.length === 0 ? <p className="muted">Registrá tu ánimo para ver cómo te sentiste.</p> : (
            <RankedBars title="Veces que registraste cada ánimo"
              items={moods.map(([id, n]) => {
                const m = MOODS.find((x) => x.id === id);
                return { key: id, icon: m?.emoji, name: m?.label ?? id, value: n, unit: n === 1 ? 'vez' : 'veces' };
              })} />
          )}
        </div>
      </PremiumGate>
    </section>
  );
}
