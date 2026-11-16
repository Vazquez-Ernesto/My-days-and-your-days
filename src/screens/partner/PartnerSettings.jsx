import { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import Header from '../../components/Header.jsx';
import { timeAgo } from '../../lib/partner.js';

export default function PartnerSettings({ onBack }) {
  const { state, updateSettings, unlinkPartner } = useStore();
  const [confirm, setConfirm] = useState(false);
  const snap = state.partner.snapshot;
  return (
    <section className="screen">
      <Header title="Ajustes" onBack={onBack} />
      <div className="card stack">
        <h3>Vinculado con {snap.name} 💞</h3>
        <p className="muted small">
          {snap.demo ? 'Estás usando datos de ejemplo.' : `Desde ${timeAgo(state.partner.linkedAt)}.`} Ella decide qué ves y puede desvincularte cuando quiera.
        </p>
        {confirm ? (
          <div className="confirm">
            <p><strong>¿Desvincularte de {snap.name}?</strong> Dejarás de ver su ciclo.</p>
            <div className="row">
              <button className="btn btn--soft btn--small" onClick={() => setConfirm(false)}>Cancelar</button>
              <button className="btn btn--danger btn--small" onClick={unlinkPartner}>Sí, desvincular</button>
            </div>
          </div>
        ) : (
          <button className="btn btn--danger btn--small" onClick={() => setConfirm(true)}>Desvincular</button>
        )}
      </div>
      <div className="card">
        <h3>Apariencia</h3>
        <div className="segmented">
          {[['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Noche']].map(([id, label]) => (
            <button key={id} className={state.settings.theme === id ? 'is-on' : ''} onClick={() => updateSettings({ theme: id })}>{label}</button>
          ))}
        </div>
      </div>
      <p className="muted small center">Los datos de {snap.name} nunca se guardan en ningún servidor sin cifrar.</p>
    </section>
  );
}
