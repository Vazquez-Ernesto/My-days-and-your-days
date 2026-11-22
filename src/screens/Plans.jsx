import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { PLANS, COMPARE } from '../state/plans.js';
import { api, errorText } from '../lib/api.js';
import { API_URL } from '../lib/config.js';
import { formatLong, todayISO } from '../lib/dates.js';
import { formatArs, formatUsd, yearlySaving, billingSummary } from '../lib/billing.js';
import Mascot from '../components/Mascot.jsx';

const LOCAL_PRICES = {
  enabled: false,
  trialDays: PLANS.premium.trialDays,
  monthly: { usd: PLANS.premium.monthly.price, ars: null },
  yearly: { usd: PLANS.premium.yearly.price, ars: null },
};

const dateOf = (instant) => formatLong(todayISO(new Date(instant)));

function Cell({ value }) {
  if (value === true) return <><span aria-hidden="true">✓</span><span className="visually-hidden">Incluido</span></>;
  if (value === false) return <><span aria-hidden="true" className="muted">—</span><span className="visually-hidden">No incluido</span></>;
  return value;
}

/** Tabla Gratis vs Premium (guía `responsive-table`: tabla real con encabezados y caption). */
function CompareTable() {
  return (
    <div className="compare-wrap" role="region" aria-labelledby="compare-caption" tabIndex={0}>
      <table className="compare-table">
        <caption id="compare-caption">Qué incluye cada plan</caption>
        <thead>
          <tr><th scope="col"><span className="visually-hidden">Función</span></th><th scope="col">Gratis</th><th scope="col">Premium</th></tr>
        </thead>
        <tbody>
          {COMPARE.map(([name, free, premium]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td><Cell value={free} /></td>
              <td className="is-premium"><Cell value={premium} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Formulario para suscribirse: elegir período (radios) y email de Mercado Pago (guía `forms`). */
function Offer({ prices, onDemo }) {
  const { state, updateCloud } = useStore();
  const [period, setPeriod] = useState('YEARLY');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);
  const saving = yearlySaving(prices);
  const trial = prices.trialDays;

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const submit = async (e) => {
    e.preventDefault();
    if (!prices.enabled) return onDemo();
    setBusy(true);
    setError(null);
    try {
      let { token, deviceId } = state.cloud;
      if (!token) {
        ({ token, deviceId } = await api.registerDevice());
        updateCloud({ token, deviceId });
      }
      const { checkoutUrl } = await api.checkout(token, period, email);
      window.location.assign(checkoutUrl); // Mercado Pago: ahí se carga la tarjeta o se paga con saldo
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  const option = (id, title, price) => (
    <label className="period" key={id}>
      <input type="radio" name="period" value={id} checked={period === id} onChange={() => setPeriod(id)} />
      <span className="period__body">
        <strong>{title}{id === 'YEARLY' && saving > 0 && <em className="period__badge">Ahorrás {saving}%</em>}</strong>
        <span className="period__price">{formatUsd(price.usd)} <small>/ {id === 'YEARLY' ? 'año' : 'mes'}</small></span>
        {price.ars != null && <small className="muted">Se cobra {formatArs(price.ars)} por {id === 'YEARLY' ? 'año' : 'mes'}</small>}
        {id === 'YEARLY' && <small className="muted">Equivale a {formatUsd(price.usd / 12)} por mes</small>}
      </span>
    </label>
  );

  return (
    <form className="offer" onSubmit={submit} aria-labelledby="plans-title">
      <fieldset className="periods">
        <legend>Elegí cómo pagar</legend>
        {option('YEARLY', 'Anual', prices.yearly)}
        {option('MONTHLY', 'Mensual', prices.monthly)}
      </fieldset>

      {prices.enabled && (
        <div className="field">
          <label htmlFor="mp-email">Tu email de Mercado Pago</label>
          <input id="mp-email" name="email" type="email" className="input" required autoComplete="email" inputMode="email"
            autoCapitalize="none" autoCorrect="off" spellCheck="false" enterKeyHint="go" maxLength={254}
            aria-describedby="mp-email-help" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
          <small id="mp-email-help" className="muted">Lo usa Mercado Pago para mandarte los comprobantes. No lo guardamos.</small>
        </div>
      )}

      {error && <p className="notice notice--error" role="alert" tabIndex={-1} ref={errorRef}>{errorText(error)}</p>}

      <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
        {busy ? 'Abriendo Mercado Pago…' : trial ? `Probar ${trial} días gratis` : 'Suscribirme'}
      </button>
      <p className="disclaimer center">
        {prices.enabled
          ? <>Pagás con Mercado Pago (tarjeta, débito o saldo). {trial ? `No se cobra nada durante los ${trial} días de prueba. ` : ''}Cancelá cuando quieras desde Ajustes.</>
          : <>Demo: los pagos todavía no están habilitados y no se realiza ningún cobro.</>}
      </p>
    </form>
  );
}

/** Ya es Premium: estado de la suscripción y cancelar. */
function Manage({ onClose }) {
  const { state, update } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const summary = billingSummary(state.billing, dateOf);
  const fromServer = Boolean(state.billing);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const me = await api.cancelBilling(state.cloud.token);
      update({ plan: me.plan, billing: { status: me.status, period: me.period, nextPaymentAt: me.nextPaymentAt, amountArs: me.amountArs } });
      setConfirming(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="manage">
      <p className="manage__status" role="status">{summary ?? 'Tenés todas las funciones Premium.'}</p>
      {fromServer && state.billing.amountArs != null && state.billing.status === 'authorized' && (
        <p className="muted small">{formatArs(state.billing.amountArs)} por {state.billing.period === 'YEARLY' ? 'año' : 'mes'}, con Mercado Pago</p>
      )}
      {error && <p className="notice notice--error" role="alert">{errorText(error)}</p>}
      {fromServer && state.billing.status === 'authorized' && (confirming ? (
        <div className="manage__confirm">
          <p id="cancel-help">No se te va a cobrar más. Seguís con Premium hasta {state.billing.nextPaymentAt ? `el ${dateOf(state.billing.nextPaymentAt)}` : 'el final del período'}.</p>
          <div className="row">
            <button type="button" className="btn btn--soft" onClick={() => setConfirming(false)} autoFocus>Mantener Premium</button>
            <button type="button" className="btn btn--danger" onClick={cancel} disabled={busy} aria-describedby="cancel-help">
              {busy ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn--outline btn--block" onClick={() => setConfirming(true)}>Cancelar suscripción</button>
      ))}
      {!fromServer && (
        <button type="button" className="btn btn--outline btn--block" onClick={() => { update({ plan: 'free' }); onClose(); }}>
          Volver a Gratis (demo)
        </button>
      )}
    </div>
  );
}

export default function Plans({ onClose, returning = false, onRefresh }) {
  const { state, update } = useStore();
  const dialog = useRef(null);
  const [prices, setPrices] = useState(LOCAL_PRICES);
  const [checking, setChecking] = useState(false);
  const isPremium = state.plan === 'premium';

  // guía `dialog`: <dialog> nativo abierto con showModal() (foco, Esc y gesto atrás los maneja el navegador)
  useEffect(() => {
    const d = dialog.current;
    if (!d.open) d.showModal();
    const closed = () => onClose();
    d.addEventListener('close', closed);
    return () => d.removeEventListener('close', closed);
  }, [onClose]);

  useEffect(() => {
    if (!API_URL) return;
    api.getPrices().then((p) => p && setPrices(p)).catch(() => {});
  }, []);

  const recheck = async () => {
    setChecking(true);
    await onRefresh?.();
    setChecking(false);
  };

  let mood = 'sparkle';
  let title = 'My Days Premium';
  let lead = 'Conocé tu ciclo a fondo, sin anuncios.';
  if (returning) { mood = 'wait'; title = 'Confirmando tu pago…'; lead = 'Estamos esperando la confirmación de Mercado Pago. Tarda unos segundos.'; }
  else if (isPremium) { mood = 'party'; title = 'Ya sos Premium 🎉'; lead = 'Gracias por apoyar My Days.'; }
  else if (state.billing?.status === 'pending') { mood = 'wait'; lead = 'Todavía no nos llegó la confirmación de Mercado Pago. Si ya pagaste, se activa sola en unos minutos.'; }

  return (
    <dialog ref={dialog} className="plans" aria-labelledby="plans-title">
      <form method="dialog" className="plans__close">
        <button className="icon-btn" aria-label="Cerrar">✕</button>
      </form>
      <Mascot mood={mood} size={96} className="plans__luni" />
      <h1 id="plans-title">{title}</h1>
      <p className="muted" role={returning ? 'status' : undefined}>{lead}</p>

      {!returning && (isPremium
        ? <Manage onClose={() => dialog.current?.close()} />
        : <>
            {state.billing?.status === 'pending' && (
              <button type="button" className="btn btn--soft btn--block" onClick={recheck} disabled={checking}>
                {checking ? 'Revisando…' : 'Ya pagué, revisar de nuevo'}
              </button>
            )}
            <Offer prices={prices} onDemo={() => { update({ plan: 'premium' }); dialog.current?.close(); }} />
          </>)}

      {!returning && <CompareTable />}
    </dialog>
  );
}
