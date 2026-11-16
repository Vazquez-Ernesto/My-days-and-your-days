import { useStore } from '../state/store.jsx';
import Toggle from './Toggle.jsx';
import { SHARE_LABELS } from '../lib/partner.js';

/** Ajustes del lado de ella: nombre, qué comparte, invitar y vista previa. */
export default function PartnerShareCard({ onInvite, onPreview }) {
  const { state, updateSharing, setShare } = useStore();
  const { name, shares } = state.sharing;
  return (
    <div className="card stack">
      <div>
        <h3>Modo pareja 💞</h3>
        <p className="muted small">Tu pareja ve solo lo que actives acá. Tus notas, relaciones y peso nunca se comparten.</p>
      </div>
      <label className="stack-sm" htmlFor="share-name">
        <span className="small"><strong>Tu nombre</strong> <span className="muted">(así te ve tu pareja)</span></span>
        <input id="share-name" className="input" placeholder="Ej.: Ana" maxLength={30} value={name}
          onChange={(e) => updateSharing({ name: e.target.value })} />
      </label>
      <div className="share-list">
        {Object.entries(SHARE_LABELS).map(([key, { label, help }]) => (
          <div key={key} className="rem-row__main share-row">
            <div className="grow"><strong className="small">{label}</strong><p className="muted small">{help}</p></div>
            <Toggle id={`share-${key}`} checked={shares[key]} onChange={(on) => setShare(key, on)} label={`Compartir: ${label}`} />
          </div>
        ))}
      </div>
      <div className="row">
        <button className="btn btn--soft" onClick={onPreview}>Ver lo que ve tu pareja</button>
        <button className="btn btn--primary" onClick={onInvite}>Invitar</button>
      </div>
    </div>
  );
}
