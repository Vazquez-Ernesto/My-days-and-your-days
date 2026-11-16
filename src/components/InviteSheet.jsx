import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useStore } from '../state/store.jsx';
import { inviteLink } from '../lib/partner.js';

/** Invitación: QR + link para que él se vincule. */
export default function InviteSheet({ onClose }) {
  const { state, ensureInviteCode } = useStore();
  const code = state.sharing.inviteCode;
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);
  const link = code ? inviteLink(code) : '';

  useEffect(() => { ensureInviteCode(); }, [ensureInviteCode]);
  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: '#3b2030', light: '#ffffff' } }).then(setQr).catch(() => setQr(null));
  }, [link]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
  };
  const share = () => navigator.share?.({ title: 'My Days', text: 'Vinculate conmigo en My Days 💞', url: link }).catch(() => {});

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet invite" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Invitar a mi pareja">
        <div className="sheet__handle" />
        <h2>Invitar a mi pareja</h2>
        <p className="muted small">Que escanee el código con la cámara del iPhone, o mandale el link.</p>
        <div className="invite__qr">{qr ? <img src={qr} alt="Código QR de invitación" /> : <span className="muted">Generando…</span>}</div>
        <p className="invite__code" aria-label="Código de invitación">{code}</p>
        <input className="input invite__link" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link de invitación" />
        <div className="row">
          <button className="btn btn--soft" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar link'}</button>
          {'share' in navigator && <button className="btn btn--primary" onClick={share}>Compartir</button>}
        </div>
        <p className="notice">
          🧪 <strong>Etapa de prueba:</strong> la vinculación real entre dos teléfonos llega con el servidor.
          Por ahora podés ver cómo queda con <em>“Ver lo que ve tu pareja”</em>.
        </p>
        <button className="btn btn--soft btn--block" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
