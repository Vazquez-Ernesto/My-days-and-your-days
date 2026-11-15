import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { startPeriod } from '../lib/cycle.js';
import { addDays } from '../lib/dates.js';

function Stepper({ value, onChange, min, max, unit }) {
  return (
    <div className="stepper">
      <button className="icon-btn" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Menos">−</button>
      <span><strong>{value}</strong> {unit}</span>
      <button className="icon-btn" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Más">+</button>
    </div>
  );
}

export { Stepper };

export default function Onboarding() {
  const { state, today, update } = useStore();
  const [step, setStep] = useState(0);
  const [lastStart, setLastStart] = useState(addDays(today, -7));
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);

  const finish = () => update({
    onboarded: true,
    periodDays: startPeriod([], lastStart, periodLength),
    settings: { ...state.settings, cycleLength, periodLength },
  });

  const steps = [
    <>
      <div className="hero-emoji">🌸</div>
      <h1>Bienvenida a My Days</h1>
      <p className="muted">Seguí tu ciclo, conocé tu cuerpo y anticipate a tus días. Tus datos se guardan solo en tu teléfono.</p>
      <button className="btn btn--primary btn--block" onClick={() => setStep(1)}>Empezar</button>
    </>,
    <>
      <h2>¿Cuándo empezó tu último período?</h2>
      <input type="date" className="input" value={lastStart} max={today} onChange={(e) => setLastStart(e.target.value)} />
      <button className="btn btn--primary btn--block" disabled={!lastStart} onClick={() => setStep(2)}>Siguiente</button>
    </>,
    <>
      <h2>¿Cuánto dura tu período?</h2>
      <Stepper value={periodLength} onChange={setPeriodLength} min={2} max={10} unit="días" />
      <h2>¿Y tu ciclo completo?</h2>
      <p className="muted">Desde el primer día de un período hasta el primero del siguiente. Si no sabés, dejá 28.</p>
      <Stepper value={cycleLength} onChange={setCycleLength} min={20} max={45} unit="días" />
      <button className="btn btn--primary btn--block" onClick={finish}>Listo</button>
    </>,
  ];

  return (
    <div className="onboarding">
      <div className="dots">{steps.map((_, i) => <i key={i} className={i === step ? 'is-on' : ''} />)}</div>
      <div className="onboarding__body">{steps[step]}</div>
    </div>
  );
}
