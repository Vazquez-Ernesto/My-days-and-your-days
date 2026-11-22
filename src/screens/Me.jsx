import { useMemo, useState } from 'react';
import { useStore } from '../state/store.jsx';
import Header from '../components/Header.jsx';
import Icon from '../components/Icons.jsx';
import { PremiumGate } from '../components/Premium.jsx';
import Mascot from '../components/Mascot.jsx';
import { SYMPTOM_EMOJI, MOODS, FLOWS, SEX } from '../components/DayLogSheet.jsx';
import { cycleLengths, cycleDayOf, phaseOfDay, symptomCounts, symptomPattern } from '../lib/cycle.js';
import { addDays, formatShort, formatLong, diffDays } from '../lib/dates.js';

const RANGES = [{ months: 3, label: '3 meses' }, { months: 6, label: '6 meses' }, { months: 12, label: '12 meses' }];
const PHASE_FILTERS = [
  { id: 'all', label: 'Todas las fases' }, { id: 'menstrual', label: 'Período' },
  { id: 'follicular', label: 'Folicular' }, { id: 'fertile', label: 'Fértil' }, { id: 'luteal', label: 'Lútea' },
];

function Sparkline({ values }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 96 + 2},${30 - ((v - min) / span) * 26}`).join(' ');
  const [lx, ly] = pts.split(' ').at(-1).split(',');
  return (
    <svg className="spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.5" fill="currentColor" />
    </svg>
  );
}

function Measure({ icon, title, unit, entries, onAdd, decimals }) {
  const last = entries.at(-1);
  return (
    <div className="card stack">
      <h2 className="card__title">{title}</h2>
      <div className="measure">
        <span className="measure__icon"><Icon name={icon} /></span>
        <div className="grow">
          {last ? <><strong className="measure__value">{last[1].toFixed(decimals)} {unit}</strong><p className="muted small">{formatLong(last[0])}</p></>
            : <p className="muted">Sin registros todavía</p>}
        </div>
        <Sparkline values={entries.slice(-12).map((e) => e[1])} />
      </div>
      <button className="btn btn--soft btn--block" onClick={onAdd}>Añadir {title.toLowerCase()}</button>
    </div>
  );
}

function logSummary(log) {
  const parts = [];
  if (log.flow) parts.push(FLOWS.find((f) => f.id === log.flow)?.label);
  const mood = MOODS.find((m) => m.id === log.mood);
  if (mood) parts.push(`${mood.emoji} ${mood.label}`);
  if (log.symptoms?.length) parts.push(log.symptoms.join(', '));
  if (log.sex) parts.push(`♥ ${SEX.find((s) => s.id === log.sex)?.label}`);
  if (log.weight) parts.push(`${log.weight} kg`);
  if (log.temp) parts.push(`${log.temp} °C`);
  if (log.pill) parts.push('💊');
  if (log.note) parts.push(`“${log.note}”`);
  return parts.join(' · ');
}

export default function Me({ onUpgrade, onSettings, onLog }) {
  const { state, periods, predictions, averages, today } = useStore();
  const [range, setRange] = useState(3);
  const [phase, setPhase] = useState('all');
  const [pickedSymptom, setPickedSymptom] = useState(null);
  const logs = state.logs;

  const from = addDays(today, -Math.round(range * 30.4));
  const counts = useMemo(() => symptomCounts(logs, {
    from, phase,
    phaseOf: (d) => phaseOfDay(cycleDayOf(d, periods, predictions), averages.cycleLength, averages.periodLength),
  }), [logs, from, phase, periods, predictions, averages]);
  const maxCount = counts.top[0]?.[1] ?? 1;

  const allTop = symptomCounts(logs, { from: '0000-00-00' }).top;
  const symptom = pickedSymptom ?? allTop[0]?.[0];
  const pattern = symptom ? symptomPattern(symptom, periods, logs, today, 3) : [];
  const duringPeriod = pattern.filter((r) => r.days.slice(0, r.periodLength).some(Boolean)).length;

  const lengths = cycleLengths(periods);
  const maxLen = Math.max(35, ...lengths);
  const cyclesUsed = Math.min(6, lengths.length);

  const entries = Object.entries(logs).sort(([a], [b]) => a.localeCompare(b));
  const sexLogs = entries.filter(([, l]) => l.sex);
  const week = sexLogs.filter(([d]) => diffDays(today, d) < 7);
  const inRange = sexLogs.filter(([d]) => d >= from);
  const orgasmPct = inRange.length ? Math.round((inRange.filter(([, l]) => l.orgasm).length / inRange.length) * 100) : 0;
  const weights = entries.filter(([, l]) => l.weight).map(([d, l]) => [d, l.weight]);
  const temps = entries.filter(([, l]) => l.temp).map(([d, l]) => [d, l.temp]);

  return (
    <section className="screen">
      <Header title="Yo" onSettings={onSettings} />

      <div className="card stack">
        <div>
          <h2 className="card__title">Análisis del ciclo</h2>
          <p className="muted small">{cyclesUsed ? `Basado en tus últimos ${cyclesUsed} ciclo${cyclesUsed === 1 ? '' : 's'}` : 'Basado en tu configuración (registrá 2 períodos para usar tus datos)'}</p>
        </div>
        <div className="tiles">
          <div className="tile tile--cycle"><span className="tile__n">{averages.cycleLength} días</span><span>Promedio de ciclo</span></div>
          <div className="tile tile--period"><span className="tile__n">{averages.periodLength} días</span><span>Promedio de período</span></div>
        </div>
      </div>

      <div className="card stack">
        <div className="row row--between">
          <h2 className="card__title">Síntomas recientes</h2>
          <select className="select" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Rango">
            {RANGES.map((r) => <option key={r.months} value={r.months}>{r.label}</option>)}
          </select>
        </div>
        <div className="chips chips--scroll">
          {PHASE_FILTERS.map((p) => (
            <button key={p.id} className={`chip ${phase === p.id ? 'is-on' : ''}`} onClick={() => setPhase(p.id)}>{p.label}</button>
          ))}
        </div>
        {counts.total === 0 ? (
          <div className="empty"><Mascot mood="sleepy" size={72} /><p className="muted">No hay síntomas registrados en este período. ¡Mejor así!</p></div>
        ) : (
          <>
            <p><strong className="big-n">{counts.total}</strong> veces</p>
            <p className="muted small">Síntoma más registrado: <strong>{counts.top[0][0]}</strong>.</p>
            {counts.top.slice(0, 6).map(([s, n]) => (
              <div key={s} className="sym">
                <span className="sym__icon" aria-hidden="true">{SYMPTOM_EMOJI[s] ?? '•'}</span>
                <div className="grow">
                  <span>{s}</span>
                  <div className="sym__bar"><i style={{ width: `${(n / maxCount) * 100}%` }} /><b>x{n}</b></div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <PremiumGate feature="symptomPatterns" title="Patrones de síntomas por ciclo" onUpgrade={onUpgrade}>
        <div className="card stack">
          <h2 className="card__title">Patrón por ciclo</h2>
          {!symptom ? <p className="muted">Registrá síntomas para descubrir cuándo aparecen.</p> : (
            <>
              <div className="chips chips--scroll">
                {allTop.slice(0, 5).map(([s]) => (
                  <button key={s} className={`chip ${s === symptom ? 'is-on' : ''}`} onClick={() => setPickedSymptom(s)}>{SYMPTOM_EMOJI[s]} {s}</button>
                ))}
              </div>
              <p className="small">
                Registraste <strong>{symptom}</strong> durante la menstruación en <strong>{duringPeriod} de {pattern.length}</strong> ciclos.
              </p>
              <div className="pattern">
                {pattern.map((r) => (
                  <div key={r.start} className="pattern__row">
                    <span className="pattern__label">{formatShort(r.start)}<small>{r.current ? 'Actual' : `${r.length} días`}</small></span>
                    <div className="pattern__dots">
                      {r.days.map((on, i) => <i key={i} className={`${on ? 'on' : ''} ${i < r.periodLength ? 'per' : ''}`} title={`Día ${i + 1}`} />)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </PremiumGate>

      <PremiumGate feature="advancedStats" title="Gráfico del largo de tus ciclos" onUpgrade={onUpgrade}>
        <div className="card">
          <h2 className="card__title">Largo de tus ciclos</h2>
          {lengths.length === 0 ? <p className="muted">Aún no hay ciclos completos.</p> : (
            <div className="bars">
              {lengths.slice(-8).map((len, i) => (
                <div key={i} className="bar" style={{ '--h': `${(len / maxLen) * 100}%` }}><span>{len}</span></div>
              ))}
            </div>
          )}
        </div>
      </PremiumGate>

      <div className="card stack">
        <h2 className="card__title">Vida sexual</h2>
        <p className="muted small">Esta semana {week.length} {week.length === 1 ? 'vez' : 'veces'}</p>
        <div className="kpis">
          <div><strong>{inRange.length}x ♥</strong><span>Últimos {range} meses</span></div>
          <div><strong>{orgasmPct}%</strong><span>Con orgasmo</span></div>
          <div><strong>{inRange.filter(([, l]) => l.sex === 'protected').length}x</strong><span>Con protección</span></div>
          <div><strong>{inRange.filter(([, l]) => l.sex === 'unprotected').length}x</strong><span>Sin protección</span></div>
        </div>
      </div>

      <Measure icon="scale" title="Peso" unit="kg" decimals={1} entries={weights} onAdd={() => onLog(today)} />
      <Measure icon="thermo" title="Temperatura" unit="°C" decimals={2} entries={temps} onAdd={() => onLog(today)} />

      <div className="card">
        <h2 className="card__title">Cronología</h2>
        {entries.length === 0 ? (
          <div className="empty"><Mascot mood="happy" size={72} /><p className="muted">Todos tus registros van a aparecer acá. Tocá “Registrar” para empezar.</p></div>
        ) : (
          <ul className="timeline-list">
            {entries.slice(-15).reverse().map(([d, l]) => (
              <li key={d}>
                <button onClick={() => onLog(d)}>
                  <strong>{formatShort(d)}</strong>
                  <span className="muted small">{logSummary(l)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="card__title">Historial de períodos</h2>
        <ul className="list">
          {[...periods].reverse().slice(0, 12).map((p) => (
            <li key={p.start}><span>{formatLong(p.start)}</span><span className="muted">{p.length} días</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
