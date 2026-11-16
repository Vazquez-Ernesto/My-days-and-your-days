import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { startPeriod } from '../lib/cycle.js';
import { addDays } from '../lib/dates.js';
import { demoSnapshot, inviteCodeFromHash } from '../lib/partner.js';

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
  const { state, today, update, linkPartner } = useStore();
  const invite = inviteCodeFromHash(window.location.hash);
  const [step, setStep] = useState(invite ? 'partner' : 0);
  const [code, setCode] = useState(invite ?? '');
  const [linkTried, setLinkTried] = useState(false);
  const [lastStart, setLastStart] = useState(addDays(today, -7));
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);

  const finish = () => update({
    onboarded: true,
    role: 'self',
    periodDays: startPeriod([], lastStart, periodLength),
    settings: { ...state.settings, cycleLength, periodLength },
  });

  const steps = [
    <>
      <div className="hero-emoji">🌸</div>
      <h1>Te damos la bienvenida a My Days</h1>
      <p className="muted">Seguí tu ciclo, conocé tu cuerpo y compartilo con quien quieras. Tus datos se guardan en tu teléfono.</p>
      <div className="roles">
        <button className="role" onClick={() => setStep(1)}>
          <span className="role__emoji" aria-hidden="true">🌸</span>
          <strong>Llevo mi ciclo</strong>
          <small>Registro mi período, síntomas y ánimo</small>
        </button>
        <button className="role" onClick={() => setStep('partner')}>
          <span className="role__emoji" aria-hidden="true">💞</span>
          <strong>Soy la pareja</strong>
          <small>Acompaño a mi pareja en sus días</small>
        </button>
      </div>
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

  if (step === 'partner') {
    return (
      <div className="onboarding">
        <div className="onboarding__body">
          <div className="hero-emoji">💞</div>
          <h2>Vinculate con tu pareja</h2>
          <p className="muted">Pedile que abra My Days → <strong>Ajustes</strong> → <strong>Invitar</strong>, y escaneá el QR o abrí el link que te mande.</p>
          <input className="input input--code" placeholder="Código: XXXX-XXXX" value={code} maxLength={9} aria-label="Código de invitación"
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setLinkTried(false); }} />
          <button className="btn btn--primary btn--block" disabled={!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)} onClick={() => setLinkTried(true)}>Vincular</button>
          {linkTried && (
            <p className="notice" role="status">🧪 La vinculación real entre dos teléfonos llega con el servidor (próxima etapa). Mientras tanto, probá con datos de ejemplo.</p>
          )}
          <button className="btn btn--soft btn--block" onClick={() => { history.replaceState(null, '', window.location.pathname); linkPartner(demoSnapshot()); }}>
            Probar con datos de ejemplo
          </button>
          <button className="btn btn--link" onClick={() => setStep(0)}>Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <div className="dots">{steps.map((_, i) => <i key={i} className={i === step ? 'is-on' : ''} />)}</div>
      <div className="onboarding__body">{steps[step]}</div>
    </div>
  );
}
