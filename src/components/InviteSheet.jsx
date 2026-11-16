import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useStore } from '../state/store.jsx';
import { inviteLink } from '../lib/partner.js';
import { api, errorText } from '../lib/api.js';
import { generateKey } from '../lib/crypto.js';
import { API_URL } from '../lib/config.js';
import { timeAgo } from '../lib/partner.js';

/** Ella registra el teléfono si hace falta y crea (o reutiliza) la invitación en el servidor. */
async function prepareInvite({ state, updateCloud }) {
  let { token, deviceId, key, pairId } = state.cloud;
  if (!token) {
    const d = await api.registerDevice();
    token = d.token;
    deviceId = d.deviceId;
    updateCloud({ token, deviceId });
  }
  const pair = await api.createInvite(token);
  if (pair.pairId !== pairId || !key) key = generateKey(); // vínculo nuevo → clave nueva
  updateCloud({ pairId: pair.pairId, key, status: 'pending', inviteCode: pair.inviteCode, inviteExpiresAt: pair.inviteExpiresAt });
}

export default function InviteSheet({ onClose }) {
  const store = useStore();
  const { state, ensureInviteCode } = store;
  const c = state.cloud;
  const online = Boolean(API_URL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);

  const valid = c.status === 'pending' && c.inviteCode && c.inviteExpiresAt && new Date(c.inviteExpiresAt) > new Date();
  const code = online ? (valid ? c.inviteCode : null) : state.sharing.inviteCode;
  const link = code ? inviteLink(code, online ? c.key : 'demo'.padEnd(43, '0')) : '';

  const create = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { await prepareInvite(store); } catch (e) { setError(e); } finally { setLoading(false); }
  }, [store]);

  useEffect(() => {
    if (!online) ensureInviteCode();
    else if (!valid && c.status !== 'active' && !loading && !error) create();
  }, [online, valid, c.status, loading, error, create, ensureInviteCode]);

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

        {c.status === 'active' ? (
          <p className="notice notice--ok" role="status">¡Ya están vinculados! 💞 Tu pareja ve lo que compartís.</p>
        ) : error ? (
          <>
            <p className="notice notice--error" role="alert">{errorText(error)}</p>
            <button className="btn btn--primary btn--block" onClick={create}>Reintentar</button>
          </>
        ) : !code ? (
          <p className="muted center" role="status">Creando la invitación…</p>
        ) : (
          <>
            <p className="muted small">
              Mandale el link (por WhatsApp, por ejemplo). En su iPhone tiene que abrir <strong>My Days</strong> y tocar <strong>Pegar link de invitación</strong>.
            </p>
            <div className="invite__qr">{qr ? <img src={qr} alt="Código QR de invitación" /> : <span className="muted">Generando…</span>}</div>
            <p className="invite__code" aria-label="Código de invitación">{code}</p>
            <input className="input invite__link" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link de invitación" />
            <div className="row">
              <button className="btn btn--soft" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar link'}</button>
              {'share' in navigator && <button className="btn btn--primary" onClick={share}>Compartir</button>}
            </div>
            {online ? (
              <p className="muted small center" role="status">
                ⏳ Esperando que tu pareja acepte · vence {c.inviteExpiresAt ? `en ${Math.max(1, Math.round((new Date(c.inviteExpiresAt) - Date.now()) / 3.6e6))} h` : 'en 24 h'}
              </p>
            ) : (
              <p className="notice">🧪 <strong>Modo prueba:</strong> todavía no hay servidor conectado. Probá con <em>“Ver lo que ve tu pareja”</em>.</p>
            )}
            <p className="muted small center">🔒 El link incluye la clave de cifrado: compartilo solo con tu pareja.</p>
          </>
        )}
        <button className="btn btn--soft btn--block" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

export { timeAgo };
