import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { Stepper } from './Onboarding.jsx';
import { PremiumGate, PremiumBadge } from '../components/Premium.jsx';
import { PLANS } from '../state/plans.js';

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

export default function Settings({ onUpgrade }) {
  const { state, updateSettings, update, reset } = useStore();
  const { settings } = state;
  const [pinDraft, setPinDraft] = useState('');

  return (
    <section className="screen">
      <header className="screen__head"><h1>Ajustes</h1></header>

      <div className="card plan-card">
        <div>
          <p className="muted small">Tu plan</p>
          <strong>{PLANS[state.plan].name}</strong> {state.plan === 'premium' && <PremiumBadge />}
        </div>
        {state.plan === 'free'
          ? <button className="btn btn--primary btn--small" onClick={onUpgrade}>Mejorar</button>
          : <button className="btn btn--outline btn--small" onClick={() => update({ plan: 'free' })}>Volver a Gratis (demo)</button>}
      </div>

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

      <PremiumGate feature="partnerMode" title="Modo pareja" onUpgrade={onUpgrade}>
        <div className="card">
          <h3>Modo pareja 💞</h3>
          <p className="muted small">Tu pareja podrá ver tus fases y recibir avisos antes de tus días. Próximamente: requiere sincronización en la nube.</p>
        </div>
      </PremiumGate>

      <div className="card">
        <h3>Datos</h3>
        <p className="muted small">Todo se guarda solo en este dispositivo. No hay cuentas ni servidores.</p>
        <button className="btn btn--danger btn--small" onClick={() => {
          if (confirm('¿Borrar todos tus datos? No se puede deshacer.')) reset();
        }}>Borrar todo</button>
      </div>
    </section>
  );
}
