import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { PLANS } from '../state/plans.js';

export default function Plans({ onClose }) {
  const { state, update } = useStore();
  const [billing, setBilling] = useState('yearly');
  const premium = PLANS.premium;
  const option = premium[billing];

  // DEMO: en producción acá se abre Google Play Billing / App Store / Stripe
  // y el servidor confirma la compra antes de activar el plan.
  const subscribe = () => { update({ plan: 'premium' }); onClose(); };

  return (
    <div className="plans">
      <button className="icon-btn plans__close" onClick={onClose} aria-label="Cerrar">✕</button>
      <div className="hero-emoji">💗</div>
      <h1>My Days Premium</h1>
      <p className="muted">Conocé tu ciclo a fondo y compartilo con quien quieras.</p>

      <ul className="features">
        {premium.features.map((f) => <li key={f}>✓ {f}</li>)}
      </ul>

      <div className="billing">
        {['yearly', 'monthly'].map((b) => (
          <button key={b} className={`billing__opt ${billing === b ? 'is-on' : ''}`} onClick={() => setBilling(b)}>
            <strong>{b === 'yearly' ? 'Anual' : 'Mensual'}</strong>
            <span>{premium[b].label}</span>
            {premium[b].badge && <em>{premium[b].badge}</em>}
          </button>
        ))}
      </div>

      {state.plan === 'premium' ? (
        <p className="center">Ya sos Premium 🎉</p>
      ) : (
        <button className="btn btn--primary btn--block" onClick={subscribe}>
          Probar {premium.trialDays} días gratis
        </button>
      )}
      <p className="disclaimer center">
        Luego {option.label}. Cancelá cuando quieras. <br />Demo: no se realiza ningún cobro.
      </p>

      <details className="compare">
        <summary>¿Qué incluye el plan Gratis?</summary>
        <ul>{PLANS.free.features.map((f) => <li key={f}>{f}</li>)}</ul>
      </details>
    </div>
  );
}
