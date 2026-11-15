import { useStore } from '../state/store.jsx';
import { cycleLengths } from '../lib/cycle.js';
import { formatLong } from '../lib/dates.js';
import { PremiumGate } from '../components/Premium.jsx';

export default function Stats({ onUpgrade }) {
  const { state, periods, averages } = useStore();
  const lengths = cycleLengths(periods);
  const maxLen = Math.max(35, ...lengths);

  const symptomCount = {};
  Object.values(state.logs).forEach((l) => l.symptoms.forEach((s) => { symptomCount[s] = (symptomCount[s] ?? 0) + 1; }));
  const topSymptoms = Object.entries(symptomCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxSym = topSymptoms[0]?.[1] ?? 1;

  return (
    <section className="screen">
      <header className="screen__head"><h1>Estadísticas</h1></header>

      <div className="stats-grid">
        <div className="card stat"><span className="stat__n">{averages.cycleLength}</span><span className="muted">días de ciclo promedio</span></div>
        <div className="card stat"><span className="stat__n">{averages.periodLength}</span><span className="muted">días de período promedio</span></div>
      </div>
      {!averages.basedOnHistory && (
        <p className="muted small">Usamos tu configuración hasta tener al menos 2 períodos registrados.</p>
      )}

      <PremiumGate feature="advancedStats" title="Gráficos de ciclos y síntomas" onUpgrade={onUpgrade}>
        <div className="card">
          <h3>Largo de tus ciclos</h3>
          {lengths.length === 0 ? <p className="muted">Aún no hay ciclos completos.</p> : (
            <div className="bars">
              {lengths.slice(-8).map((len, i) => (
                <div key={i} className="bar" style={{ '--h': `${(len / maxLen) * 100}%` }}><span>{len}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Síntomas más frecuentes</h3>
          {topSymptoms.length === 0 ? <p className="muted">Registrá síntomas para ver tendencias.</p> : (
            topSymptoms.map(([s, n]) => (
              <div key={s} className="hbar">
                <span>{s}</span>
                <div className="hbar__track"><div style={{ width: `${(n / maxSym) * 100}%` }} /></div>
                <small>{n}</small>
              </div>
            ))
          )}
        </div>
      </PremiumGate>

      <div className="card">
        <h3>Historial</h3>
        <ul className="list">
          {[...periods].reverse().slice(0, 12).map((p) => (
            <li key={p.start}><span>{formatLong(p.start)}</span><span className="muted">{p.length} días</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
