import { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import Header from '../../components/Header.jsx';
import Toggle from '../../components/Toggle.jsx';
import { Stepper } from '../Onboarding.jsx';
import { PERMISSION_TEXT } from '../Reminders.jsx';
import { permission, requestPermission } from '../../lib/notifications.js';

export default function PartnerReminders({ onSettings }) {
  const { state, updatePartnerPrefs } = useStore();
  const prefs = state.partner.prefs;
  const name = state.partner.snapshot.name;
  const [perm, setPerm] = useState(permission());
  const toggleSystem = async (on) => {
    updatePartnerPrefs({ enabled: on });
    if (on) setPerm(await requestPermission());
  };
  const set = (key, patch) => updatePartnerPrefs({ [key]: { ...prefs[key], ...patch } });

  return (
    <section className="screen">
      <Header title="Avisos" onSettings={onSettings} />
      <div className="card">
        <div className="rem-row__main">
          <div className="grow">
            <strong>Notificaciones en el teléfono</strong>
            <p className="muted small">Los avisos siempre aparecen en la pantalla Hoy.</p>
          </div>
          <Toggle id="p-system" checked={prefs.enabled} onChange={toggleSystem} label="Activar avisos" />
        </div>
        {prefs.enabled && <p className="muted small perm">{PERMISSION_TEXT[perm]}</p>}
      </div>

      <h2 className="section-title">Avisarme cuando…</h2>
      <div className="card card--list">
        <div className={`rem-row ${prefs.periodSoon.on ? '' : 'is-off'}`}>
          <div className="rem-row__main">
            <div className="grow"><strong>Se acerca el período de {name}</strong></div>
            <Toggle id="p-soon" checked={prefs.periodSoon.on} onChange={(on) => set('periodSoon', { on })} label="Se acerca su período" />
          </div>
          {prefs.periodSoon.on && (
            <div className="rem-row__opts">
              <span className="muted small">Días antes</span>
              <Stepper value={prefs.periodSoon.daysBefore} min={1} max={5} unit="d" onChange={(v) => set('periodSoon', { daysBefore: v })} />
            </div>
          )}
        </div>
        <div className={`rem-row ${prefs.periodStart.on ? '' : 'is-off'}`}>
          <div className="rem-row__main">
            <div className="grow"><strong>Empieza su período</strong></div>
            <Toggle id="p-start" checked={prefs.periodStart.on} onChange={(on) => set('periodStart', { on })} label="Empieza su período" />
          </div>
        </div>
        <div className={`rem-row ${prefs.moments.on ? '' : 'is-off'}`}>
          <div className="rem-row__main">
            <div className="grow"><strong>Comparte cómo se siente</strong><p className="muted small">“Sensible”, “Pensando en ti”, “Extraño tu voz”…</p></div>
            <Toggle id="p-moments" checked={prefs.moments.on} onChange={(on) => set('moments', { on })} label="Comparte cómo se siente" />
          </div>
        </div>
      </div>
    </section>
  );
}
