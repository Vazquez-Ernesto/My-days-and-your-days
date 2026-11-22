import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Mascot from '../components/Mascot.jsx';
import { useStore } from '../state/store.jsx';
import { startPeriod } from '../lib/cycle.js';
import { addDays, formatLong } from '../lib/dates.js';
import { demoSnapshot, parseInvite } from '../lib/partner.js';
import { api, errorText, ApiError } from '../lib/api.js';
import { API_URL } from '../lib/config.js';
import { isIOS, isStandalone } from '../lib/install.js';

/** Selector de números: botones − / + y el valor anunciado al cambiar (aria-live). */
function Stepper({ value, onChange, min, max, unit, label }) {
  return (
    <div className="stepper" role={label ? 'group' : undefined} aria-label={label}>
      <button type="button" className="icon-btn" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Menos" disabled={value <= min}>−</button>
      <output aria-live="polite"><strong>{value}</strong> {unit}</output>
      <button type="button" className="icon-btn" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Más" disabled={value >= max}>+</button>
    </div>
  );
}

export { Stepper };

/**
 * Cambia de paso con una View Transition direccional (guía `directional-navigation-transitions`):
 * adelante desliza desde la derecha, atrás desde la izquierda. Sin soporte, cambia sin animar.
 */
function navigate(update, direction) {
  if (!document.startViewTransition) return update();
  try {
    document.startViewTransition({ update: () => flushSync(update), types: [direction] });
  } catch {
    // Safari 18.0 no acepta el objeto con `types`: cambio sin animación
    update();
  }
}

/** Próximo inicio de período estimado a partir del último y la duración del ciclo. */
export function nextPeriodFrom(lastStart, cycleLength, today) {
  let next = lastStart;
  while (next <= today) next = addDays(next, cycleLength);
  return next;
}

const PERKS = [
  { emoji: '🔮', text: 'Predicciones de tu período y tus días fértiles' },
  { emoji: '🔒', text: 'Tus datos quedan en tu teléfono; lo compartido viaja cifrado' },
  { emoji: '💞', text: 'Compartí con tu pareja solo lo que vos elijas' },
];

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

  const finish = (e) => {
    e?.preventDefault();
    update({
      onboarded: true,
      role: 'self',
      periodDays: startPeriod([], lastStart, periodLength),
      settings: { ...state.settings, cycleLength, periodLength },
    });
  };

  // guía `forms` (formularios de varios pasos): al cambiar de paso, el foco va al título nuevo
  const heading = useRef(null);
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return; // al abrir la app no movemos el foco
    shownStep.current = step;
    heading.current?.focus();
  }, [step]);
  const go = (to) => navigate(() => setStep(to), to === 0 || (typeof to === 'number' && to < step) ? 'backward' : 'forward');

  if (step === 'partner') {
    return (
      <main className="onboarding">
        <div className="onboarding__body">
          <Mascot mood="love" size={104} className="onboarding__luni" />
          <h1 ref={heading} tabIndex={-1}>Vinculate con tu pareja</h1>
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
                autoCorrect="off" autoCapitalize="none" spellCheck="false"
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
          <button className="btn btn--link" onClick={() => go(0)}>Volver</button>
        </div>
      </main>
    );
  }

  if (step === 0) {
    return (
      <main className="onboarding onboarding--welcome">
        <div className="onboarding__body">
          <Mascot mood="happy" size={132} interactive className="onboarding__luni" />
          <h1 ref={heading} tabIndex={-1}>Te damos la bienvenida a My Days</h1>
          <p className="muted onboarding__lead">Soy Luni y te voy a acompañar en tus días. ¿Cómo vas a usar la app?</p>
          <div className="roles">
            <button className="role" onClick={() => go(1)}>
              <span className="role__emoji" aria-hidden="true">🌸</span>
              <span className="role__text">
                <strong>Llevo mi ciclo</strong>
                <small>Registro mi período, síntomas y ánimo</small>
              </span>
            </button>
            <button className="role" onClick={() => go('partner')}>
              <span className="role__emoji" aria-hidden="true">💞</span>
              <span className="role__text">
                <strong>Soy la pareja</strong>
                <small>Acompaño a mi pareja en sus días</small>
              </span>
            </button>
          </div>
          <ul className="perks">
            {PERKS.map((p) => <li key={p.emoji}><span aria-hidden="true">{p.emoji}</span>{p.text}</li>)}
          </ul>
        </div>
      </main>
    );
  }

  const next = lastStart && lastStart <= today ? nextPeriodFrom(lastStart, cycleLength, today) : null;
  return (
    <main className="onboarding">
      <div className="onboarding__top">
        <button type="button" className="btn btn--link onboarding__back" onClick={() => go(step - 1)}>‹ Atrás</button>
        <ol className="progress" aria-label="Progreso">
          {['Último período', 'Duración'].map((label, i) => (
            <li key={label} className={i + 1 < step ? 'is-done' : i + 1 === step ? 'is-on' : ''} aria-current={i + 1 === step ? 'step' : undefined}>
              <span className="visually-hidden">Paso {i + 1} de 2: </span>{label}
            </li>
          ))}
        </ol>
      </div>
      {step === 1 ? (
        <form className="onboarding__body" onSubmit={(e) => { e.preventDefault(); if (lastStart) go(2); }}>
          <Mascot mood="wait" size={104} className="onboarding__luni" />
          <h1 ref={heading} tabIndex={-1}>¿Cuándo empezó tu último período?</h1>
          <label htmlFor="ob-last" className="muted">Elegí el primer día. Si no te acordás exacto, poné uno aproximado.</label>
          <input id="ob-last" name="lastStart" type="date" className="input" value={lastStart} max={today} required
            enterKeyHint="next" onChange={(e) => setLastStart(e.target.value)} />
          <button type="submit" className="btn btn--primary btn--block">Siguiente</button>
        </form>
      ) : (
        <form className="onboarding__body" onSubmit={finish}>
          <Mascot mood="calm" size={104} className="onboarding__luni" />
          <h1 ref={heading} tabIndex={-1}>Contame un poco de tu ciclo</h1>
          <fieldset className="ob-field">
            <legend>¿Cuánto dura tu período?</legend>
            <Stepper value={periodLength} onChange={setPeriodLength} min={2} max={10} unit="días" label="Duración del período" />
          </fieldset>
          <fieldset className="ob-field">
            <legend>¿Y tu ciclo completo?</legend>
            <p className="muted small">Desde el primer día de un período hasta el primero del siguiente. Si no sabés, dejá 28.</p>
            <Stepper value={cycleLength} onChange={setCycleLength} min={20} max={45} unit="días" label="Duración del ciclo" />
          </fieldset>
          {next && (
            <p className="ob-preview" aria-live="polite">
              <span aria-hidden="true">🔮</span> Tu próximo período sería alrededor del <strong>{formatLong(next)}</strong>
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block">Listo</button>
        </form>
      )}
    </main>
  );
}
