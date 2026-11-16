import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { startPeriod } from '../lib/cycle.js';
import { addDays } from '../lib/dates.js';
import { demoSnapshot, parseInvite } from '../lib/partner.js';
import { api, errorText, ApiError } from '../lib/api.js';
import { API_URL } from '../lib/config.js';
import { isIOS, isStandalone } from '../lib/install.js';

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
  const { state, today, update, linkPartner, updateCloud } = useStore();
  const invite = parseInvite(window.location.hash);
  const [step, setStep] = useState(invite ? 'partner' : 0);
  const [linkText, setLinkText] = useState(invite ? window.location.href : '');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState(null);
  // En iPhone, Safari y la app instalada no comparten datos: hay que vincular DESDE la app
  const iosSafari = Boolean(invite) && isIOS() && !isStandalone();

  const paste = async () => {
    try { setLinkText(await navigator.clipboard.readText()); setLinkError(null); } catch {
      setLinkError(new ApiError(0, 'PASTE', 'Mantené presionado el campo de abajo y elegí “Pegar”.'));
    }
  };

  const link = async () => {
    const parsed = parseInvite(linkText);
    if (!parsed) return setLinkError(new ApiError(0, 'BAD_LINK'));
    setLinking(true);
    setLinkError(null);
    try {
      let { token, deviceId } = state.cloud;
      if (!token) ({ token, deviceId } = await api.registerDevice());
      const pair = await api.join(token, parsed.code);
      linkPartner({ v: 1, name: 'Tu pareja', updatedAt: new Date().toISOString(), shares: {}, waiting: true });
      updateCloud({ token, deviceId, pairId: pair.pairId, key: parsed.key, status: 'active' });
      history.replaceState(null, '', window.location.pathname);
    } catch (e) {
      setLinkError(e);
    } finally {
      setLinking(false);
    }
  };
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
          {iosSafari ? (
            <div className="notice stack-sm" role="status">
              <strong>Estás en Safari.</strong>
              <span>En iPhone, vinculá desde la app: 1) copiá este link, 2) tocá Compartir → Agregar a inicio, 3) abrí My Days y tocá “Pegar link de invitación”.</span>
              <button className="btn btn--soft btn--small" onClick={() => navigator.clipboard.writeText(window.location.href).catch(() => {})}>Copiar link</button>
            </div>
          ) : (
            <p className="muted">Pedile que abra My Days → <strong>Ajustes</strong> → <strong>Invitar</strong> y que te mande el link. Copialo y pegalo acá.</p>
          )}
          {API_URL ? (
            <>
              <button className="btn btn--soft btn--block" onClick={paste}>📋 Pegar link de invitación</button>
              <textarea className="input" rows="3" placeholder="…#invitacion-XXXX-XXXX.…" value={linkText} aria-label="Link de invitación"
                onChange={(e) => { setLinkText(e.target.value); setLinkError(null); }} />
              {linkError && <p className="notice notice--error" role="alert">{linkError.code === 'PASTE' ? linkError.message : errorText(linkError)}</p>}
              <button className="btn btn--primary btn--block" disabled={!linkText.trim() || linking} onClick={link}>
                {linking ? 'Vinculando…' : 'Vincular'}
              </button>
              {linking && <p className="muted small" role="status">La primera vez puede tardar hasta un minuto.</p>}
            </>
          ) : (
            <p className="notice" role="status">🧪 El servidor todavía no está conectado. Mientras tanto, probá con datos de ejemplo.</p>
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
