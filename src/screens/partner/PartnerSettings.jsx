import { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import Header from '../../components/Header.jsx';
import { timeAgo } from '../../lib/partner.js';
import { api } from '../../lib/api.js';

export default function PartnerSettings({ onBack }) {
  const { state, updateSettings, unlinkPartner, updatePartner } = useStore();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const snap = state.partner.snapshot;
  return (
    <section className="screen">
      <Header title="Ajustes" onBack={onBack} />
      <div className="card stack">
        <h3>Vinculado con {snap.name} 💞</h3>
        <p className="muted small">
          {snap.demo ? 'Estás usando datos de ejemplo.' : `Desde ${timeAgo(state.partner.linkedAt)}. 🔒 Cifrado de extremo a extremo.`} Ella decide qué ves y puede desvincularte cuando quiera.
        </p>
        {confirm ? (
          <div className="confirm">
            <p><strong>¿Desvincularte de {snap.name}?</strong> Dejarás de ver su ciclo.</p>
            <div className="row">
              <button className="btn btn--soft btn--small" onClick={() => setConfirm(false)}>Cancelar</button>
              <button className="btn btn--danger btn--small" disabled={busy} onClick={async () => {
                setBusy(true);
                const c = state.cloud;
                if (c.pairId && !state.partner.unlinked) await api.unlink(c.token, c.pairId).catch(() => {});
                unlinkPartner();
              }}>Sí, desvincular</button>
            </div>
          </div>
        ) : (
          <button className="btn btn--danger btn--small" onClick={() => setConfirm(true)}>Desvincular</button>
        )}
      </div>
      <div className="card stack-sm">
        <label htmlFor="partner-name"><strong>Tu nombre</strong> <span className="muted small">(lo ve ella cuando le respondés)</span></label>
        <input id="partner-name" className="input" placeholder="Ej.: Ernesto" maxLength={30} value={state.partner.myName}
          onChange={(e) => updatePartner({ myName: e.target.value })} />
      </div>
      <div className="card">
        <h3>Apariencia</h3>
        <div className="segmented">
          {[['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Noche']].map(([id, label]) => (
            <button key={id} className={state.settings.theme === id ? 'is-on' : ''} onClick={() => updateSettings({ theme: id })}>{label}</button>
          ))}
        </div>
      </div>
      <p className="muted small center">Los datos de {snap.name} viajan cifrados: ni el servidor puede leerlos.</p>
    </section>
  );
}
