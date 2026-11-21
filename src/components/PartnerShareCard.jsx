import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import Toggle from './Toggle.jsx';
import { SHARE_LABELS, timeAgo } from '../lib/partner.js';
import { api, errorText } from '../lib/api.js';
import { API_URL } from '../lib/config.js';

function LinkStatus({ onInvite }) {
  const { state, resetPairing } = useStore();
  const c = state.cloud;
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(null);
  if (!API_URL) return null;

  const unlink = async () => {
    try {
      await api.unlink(c.token, c.pairId);
    } catch (e) {
      if (!['PAIR_NOT_FOUND', 'NOT_A_MEMBER'].includes(e.code)) return setError(e);
    }
    resetPairing();
    setConfirm(false);
  };

  if (c.status === 'active') {
    return (
      <div className="link-status link-status--on" role="status">
        <p><strong>Vinculada ✓</strong> <span className="muted small">{c.lastSyncAt ? `· sincronizado ${timeAgo(c.lastSyncAt)}` : ''}</span></p>
        {error && <p className="notice notice--error" role="alert">{errorText(error)}</p>}
        {confirm ? (
          <div className="confirm">
            <p><strong>¿Desvincular a tu pareja?</strong> Dejará de ver tu ciclo y se borra todo lo compartido del servidor.</p>
            <div className="row">
              <button className="btn btn--soft btn--small" onClick={() => setConfirm(false)}>Cancelar</button>
              <button className="btn btn--danger btn--small" onClick={unlink}>Sí, desvincular</button>
            </div>
          </div>
        ) : (
          <button className="btn btn--danger btn--small" onClick={() => setConfirm(true)}>Desvincular</button>
        )}
      </div>
    );
  }
  if (c.status === 'pending') {
    return (
      <div className="link-status" role="status">
        <p><strong>Invitación enviada</strong> <span className="muted small">· esperando que acepte</span></p>
        <button className="btn btn--soft btn--small" onClick={onInvite}>Ver invitación</button>
      </div>
    );
  }
  return null;
}

/** Ajustes del lado de ella: nombre, qué comparte, invitar y vista previa. */
export default function PartnerShareCard({ onInvite, onPreview }) {
  const { state, setShare } = useStore();
  const { shares } = state.sharing;
  return (
    <div className="card stack">
      <div>
        <h3>Modo pareja 💞</h3>
        <p className="muted small">Tu pareja ve solo lo que actives acá. Tus notas privadas y la píldora nunca se comparten.</p>
      </div>
      <div className="share-list">
        {Object.entries(SHARE_LABELS).map(([key, { label, help }]) => (
          <div key={key} className="rem-row__main share-row">
            <div className="grow"><strong className="small">{label}</strong><p className="muted small">{help}</p></div>
            <Toggle id={`share-${key}`} checked={shares[key]} onChange={(on) => setShare(key, on)} label={`Compartir: ${label}`} />
          </div>
        ))}
      </div>
      <LinkStatus onInvite={onInvite} />
      <div className="row">
        <button className="btn btn--soft" onClick={onPreview}>Ver lo que ve tu pareja</button>
        {state.cloud.status !== 'active' && <button className="btn btn--primary" onClick={onInvite}>Invitar</button>}
      </div>
    </div>
  );
}
