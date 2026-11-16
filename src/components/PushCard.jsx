import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import Toggle from './Toggle.jsx';
import { API_URL } from '../lib/config.js';
import { api, errorText } from '../lib/api.js';
import { enablePush, disablePush, pushSupported } from '../lib/push.js';
import { isIOS, isStandalone } from '../lib/install.js';

/** Activar notificaciones push (llegan con la app cerrada). Si no hay servidor, cae al modo local. */
export default function PushCard({ fallback }) {
  const store = useStore();
  const { state } = store;
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(null); // estado "optimista": el switch cambia al instante
  const [error, setError] = useState(null);
  const [test, setTest] = useState(null);

  if (!API_URL) return fallback;
  const on = state.cloud.pushEnabled;
  const needsInstall = isIOS() && !isStandalone();

  const toggle = async (next) => {
    setTarget(next);
    setBusy(true);
    setError(null);
    setTest(null);
    try {
      if (next) await enablePush(store);
      else await disablePush(store);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      setTarget(null); // si falló, vuelve a su estado real
    }
  };

  const sendTest = async () => {
    setTest('sending');
    try { await api.testPush(state.cloud.token); setTest('sent'); } catch (e) { setTest(null); setError(e); }
  };

  return (
    <div className="card stack-sm">
      <div className="rem-row__main">
        <div className="grow">
          <strong>Notificaciones en el teléfono</strong>
          <p className="muted small">{on ? 'Activadas ✓ Llegan aunque la app esté cerrada.' : 'Los avisos siempre aparecen en la pantalla Hoy.'}</p>
        </div>
        <Toggle id="push-toggle" checked={target ?? on} onChange={toggle} label="Activar notificaciones push" />
      </div>
      {busy && target && <p className="muted small" role="status">Activando… (si el servidor estaba en reposo puede tardar hasta un minuto)</p>}
      {needsInstall && !on && (
        <p className="notice">En iPhone, primero instalá la app: <strong>Compartir → Agregar a inicio</strong>, y abrila desde el ícono.</p>
      )}
      {!pushSupported() && !needsInstall && <p className="notice">{errorText({ code: 'PUSH_UNSUPPORTED' })}</p>}
      {error && <p className="notice notice--error" role="alert">{errorText(error)}</p>}
      {on && (
        <div className="row">
          <button className="btn btn--soft btn--small" onClick={sendTest} disabled={test === 'sending'}>
            {test === 'sending' ? 'Enviando…' : 'Enviar notificación de prueba'}
          </button>
          {test === 'sent' && <span className="muted small" role="status">Enviada: debería llegarte en segundos 📲</span>}
        </div>
      )}
    </div>
  );
}
