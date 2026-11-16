import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import Header from '../components/Header.jsx';
import Icon from '../components/Icons.jsx';
import { Stepper } from './Onboarding.jsx';
import Toggle from '../components/Toggle.jsx';
import { permission, requestPermission } from '../lib/notifications.js';

export const PERMISSION_TEXT = {
  granted: 'Notificaciones permitidas en este dispositivo.',
  denied: 'Bloqueaste las notificaciones. Activalas desde los ajustes del navegador o del teléfono.',
  default: 'Te vamos a pedir permiso para notificarte.',
  unsupported: 'Este navegador no soporta notificaciones. En iPhone, primero instalá la app en tu pantalla de inicio.',
};

const ITEMS = [
  { key: 'periodStart', label: 'Inicio del período', help: 'Antes de que llegue' },
  { key: 'periodEnd', label: 'Fin del período', help: 'Para que marques cuándo terminó' },
  { key: 'ovulation', label: 'Día de ovulación' },
  { key: 'fertile', label: 'Se aproxima el período fértil' },
  { key: 'logPeriod', label: 'Registrar período', help: 'Si tu período se atrasa' },
];

function Row({ id, label, help, item, onChange, children }) {
  return (
    <div className={`rem-row ${item.on ? '' : 'is-off'}`}>
      <div className="rem-row__main">
        <div className="grow">
          <strong>{label}</strong>
          {help && <p className="muted small">{help}</p>}
        </div>
        <Toggle id={`rem-${id}`} checked={item.on} onChange={(on) => onChange({ on })} label={label} />
      </div>
      {item.on && (
        <div className="rem-row__opts">
          <label htmlFor={`rem-${id}-time`} className="muted small">Hora</label>
          <input id={`rem-${id}-time`} type="time" className="input input--time" value={item.time}
            onChange={(e) => onChange({ time: e.target.value })} />
          {children}
        </div>
      )}
    </div>
  );
}

export default function Reminders({ onSettings }) {
  const { state, updateReminders, updateReminder } = useStore();
  const prefs = state.settings.reminders;
  const [perm, setPerm] = useState(permission());

  const toggleSystem = async (on) => {
    updateReminders({ enabled: on }); // el switch responde al instante
    if (on) setPerm(await requestPermission());
  };

  return (
    <section className="screen">
      <Header title="Recordatorios" onSettings={onSettings} />

      <div className="card">
        <div className="rem-row__main">
          <div className="grow">
            <strong>Notificaciones en el teléfono</strong>
            <p className="muted small">Los avisos siempre aparecen en la pantalla Hoy.</p>
          </div>
          <Toggle id="rem-system" checked={prefs.enabled} onChange={toggleSystem} label="Activar recordatorios" />
        </div>
        {prefs.enabled && <p className="muted small perm">{PERMISSION_TEXT[perm]}</p>}
      </div>

      <h2 className="section-title">Período y fertilidad</h2>
      <div className="card card--list">
        {ITEMS.map(({ key, label, help }) => (
          <Row key={key} id={key} label={label} help={help} item={prefs[key]} onChange={(p) => updateReminder(key, p)}>
            {key === 'periodStart' && (
              <span className="rem-row__extra">
                <span className="muted small">Días antes</span>
                <Stepper value={prefs.periodStart.daysBefore} min={1} max={5} unit="d"
                  onChange={(v) => updateReminder('periodStart', { daysBefore: v })} />
              </span>
            )}
          </Row>
        ))}
      </div>

      <h2 className="section-title"><Icon name="pill" size={18} /> Píldora anticonceptiva</h2>
      <div className="card card--list">
        <Row id="pill" label="Tomar la píldora" help="Todos los días a la misma hora" item={prefs.pill}
          onChange={(p) => updateReminder('pill', p)} />
      </div>

      <h2 className="section-title"><Icon name="stethoscope" size={18} /> Cita médica</h2>
      <div className="card card--list">
        <Row id="appointment" label="Cita con el médico" help="Te avisamos el día anterior y el mismo día"
          item={prefs.appointment} onChange={(p) => updateReminder('appointment', p)}>
          <label htmlFor="rem-appointment-date" className="muted small">Fecha</label>
          <input id="rem-appointment-date" type="date" className="input input--time" value={prefs.appointment.date}
            onChange={(e) => updateReminder('appointment', { date: e.target.value })} />
          <input id="rem-appointment-note" className="input" placeholder="Ej.: Ginecóloga, control anual"
            value={prefs.appointment.note} onChange={(e) => updateReminder('appointment', { note: e.target.value })} />
        </Row>
      </div>

      <p className="muted small center">
        En la versión web los avisos llegan cuando abrís la app (o si está abierta). Con la app de tiendas llegarán aunque esté cerrada.
      </p>
    </section>
  );
}
