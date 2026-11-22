import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { Stepper } from './Onboarding.jsx';
import { billingSummary } from '../lib/billing.js';
import { formatLong, todayISO } from '../lib/dates.js';
import { PremiumGate, PremiumBadge } from '../components/Premium.jsx';
import Header from '../components/Header.jsx';
import PartnerShareCard from '../components/PartnerShareCard.jsx';
import ProfileCard from '../components/ProfileCard.jsx';
import { PLANS } from '../state/plans.js';
import { useInstallPrompt, isStandalone, isIOS } from '../lib/install.js';

function InstallCard() {
  const { available, install } = useInstallPrompt();
  if (isStandalone()) return null;
  if (available) {
    return (
      <div className="card row row--between">
        <div><h3>Instalar My Days</h3><p className="muted small">Abrila desde tu inicio, incluso sin internet.</p></div>
        <button className="btn btn--primary btn--small" onClick={install}>Instalar</button>
      </div>
    );
  }
  if (isIOS()) {
    return (
      <div className="card">
        <h3>Instalar en iPhone</h3>
        <p className="muted small">Tocá <strong>Compartir</strong> y después <strong>Agregar a inicio</strong>.</p>
      </div>
    );
  }
  return null;
}

function exportCSV(state) {
  const dates = [...new Set([...state.periodDays, ...Object.keys(state.logs)])].sort();
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = [['fecha', 'periodo', 'flujo', 'animo', 'sintomas', 'notas']];
  dates.forEach((d) => {
    const l = state.logs[d] ?? {};
    rows.push([d, state.periodDays.includes(d) ? 'si' : 'no', l.flow, l.mood, (l.symptoms ?? []).join('; '), l.note]);
  });
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'my-days-export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Settings({ onUpgrade, onBack, onInvite, onPreview }) {
  const { state, updateSettings, reset } = useStore();
  const { settings } = state;
  const [pinDraft, setPinDraft] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <section className="screen">
      <Header title="Ajustes" onBack={onBack} />

      <div className="card plan-card">
        <div>
          <p className="muted small">Tu plan</p>
          <strong>{PLANS[state.plan].name}</strong> {state.plan === 'premium' && <PremiumBadge />}
          {state.billing && <p className="muted small">{billingSummary(state.billing, (i) => formatLong(todayISO(new Date(i))))}</p>}
        </div>
        {state.plan === 'free'
          ? <button className="btn btn--primary btn--small" onClick={onUpgrade}>Mejorar</button>
          : <button className="btn btn--outline btn--small" onClick={onUpgrade}>Administrar</button>}
      </div>

      <ProfileCard />

      <PartnerShareCard onInvite={onInvite} onPreview={onPreview} />

      <InstallCard />

      <div className="card">
        <h3>Apariencia</h3>
        <div className="segmented">
          {[['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Noche']].map(([id, label]) => (
            <button key={id} className={settings.theme === id ? 'is-on' : ''} onClick={() => updateSettings({ theme: id })}>{label}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Tu ciclo</h3>
        <p className="muted small">Se usa hasta que haya historial suficiente para calcular promedios reales.</p>
        <div className="setting-row"><span>Duración del ciclo</span>
          <Stepper value={settings.cycleLength} min={20} max={45} unit="d" onChange={(v) => updateSettings({ cycleLength: v })} /></div>
        <div className="setting-row"><span>Duración del período</span>
          <Stepper value={settings.periodLength} min={2} max={10} unit="d" onChange={(v) => updateSettings({ periodLength: v })} /></div>
      </div>

      <PremiumGate feature="pinLock" title="Bloqueo con PIN" onUpgrade={onUpgrade}>
        <div className="card">
          <h3>Bloqueo con PIN</h3>
          {settings.pin ? (
            <div className="row row--between"><span>PIN activo</span>
              <button className="btn btn--outline btn--small" onClick={() => updateSettings({ pin: null })}>Quitar</button></div>
          ) : (
            <div className="row">
              <input className="input" inputMode="numeric" maxLength={4} placeholder="4 dígitos" value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))} />
              <button className="btn btn--primary btn--small" disabled={pinDraft.length !== 4}
                onClick={() => { updateSettings({ pin: pinDraft }); setPinDraft(''); }}>Activar</button>
            </div>
          )}
        </div>
      </PremiumGate>

      <PremiumGate feature="export" title="Exportar datos (CSV)" onUpgrade={onUpgrade}>
        <div className="card row row--between">
          <div><h3>Exportar datos</h3><p className="muted small">Ideal para llevar a tu ginecóloga/o.</p></div>
          <button className="btn btn--outline btn--small" onClick={() => exportCSV(state)}>Descargar CSV</button>
        </div>
      </PremiumGate>


      <div className="card">
        <h3>Datos</h3>
        <p className="muted small">Todo se guarda solo en este dispositivo. No hay cuentas ni servidores.</p>
        {confirmReset ? (
          <div className="confirm">
            <p><strong>¿Borrar todos tus datos?</strong> No se puede deshacer.</p>
            <div className="row">
              <button className="btn btn--soft btn--small" onClick={() => setConfirmReset(false)}>Cancelar</button>
              <button className="btn btn--danger btn--small" onClick={reset}>Sí, borrar todo</button>
            </div>
          </div>
        ) : (
          <button className="btn btn--danger btn--small" onClick={() => setConfirmReset(true)}>Borrar todo</button>
        )}
      </div>
    </section>
  );
}
