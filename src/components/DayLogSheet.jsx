import { useState } from 'react';
import { useStore, EMPTY_LOG } from '../state/store.jsx';
import { formatLong } from '../lib/dates.js';

export const FLOWS = [
  { id: 'spotting', label: 'Manchado' },
  { id: 'light', label: 'Leve' },
  { id: 'medium', label: 'Medio' },
  { id: 'heavy', label: 'Abundante' },
];
// Guardamos el nombre del síntoma (compatibilidad con datos existentes) y mostramos un emoji
export const SYMPTOM_EMOJI = {
  'Cólicos': '🌀', 'Dolor de cabeza': '🤕', 'Hinchazón': '🎈', 'Acné': '🔴', 'Sensibilidad mamaria': '💢',
  'Cansancio': '😴', 'Antojos': '🍫', 'Náuseas': '🤢', 'Dolor lumbar': '🦴', 'Insomnio': '🌙',
  'Gases': '💨', 'Dolores corporales': '🤸', 'Diarrea': '🚽', 'Estreñimiento': '🪨', 'Mareos': '💫', 'Flujo vaginal': '💧',
};
export const SYMPTOMS = Object.keys(SYMPTOM_EMOJI);
export const MOODS = [
  { id: 'happy', emoji: '😊', label: 'Feliz' },
  { id: 'calm', emoji: '😌', label: 'Tranquila' },
  { id: 'sensitive', emoji: '🥺', label: 'Sensible' },
  { id: 'sad', emoji: '😢', label: 'Triste' },
  { id: 'irritable', emoji: '😤', label: 'Irritable' },
  { id: 'anxious', emoji: '😰', label: 'Ansiosa' },
];
export const SEX = [
  { id: 'protected', label: 'Con protección' },
  { id: 'unprotected', label: 'Sin protección' },
];

function NumberField({ id, label, unit, value, onChange, step, min, max }) {
  return (
    <label className="num-field" htmlFor={id}>
      <span>{label}</span>
      <span className="num-field__input">
        <input id={id} type="number" inputMode="decimal" step={step} min={min} max={max} value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
        <small>{unit}</small>
      </span>
    </label>
  );
}

export default function DayLogSheet({ date, onClose }) {
  const { state, saveLog, togglePeriodDay } = useStore();
  const [log, setLog] = useState({ ...EMPTY_LOG, ...state.logs[date] });
  const isPeriod = state.periodDays.includes(date);
  const set = (patch) => setLog((l) => ({ ...l, ...patch }));
  const pick = (key, id) => set({ [key]: log[key] === id ? null : id });

  const togglePeriod = () => {
    togglePeriodDay(date);
    if (isPeriod) set({ flow: null });
  };
  const toggleSymptom = (s) => set({
    symptoms: log.symptoms.includes(s) ? log.symptoms.filter((x) => x !== s) : [...log.symptoms, s],
  });
  const save = () => { saveLog(date, log); onClose(); };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Registro del ${formatLong(date)}`}>
        <div className="sheet__handle" />
        <h2>{formatLong(date)}</h2>

        <label className="switch-row">
          <span>Tengo el período este día</span>
          <input type="checkbox" checked={isPeriod} onChange={togglePeriod} />
        </label>

        {isPeriod && (
          <section>
            <h3>Flujo</h3>
            <div className="chips">
              {FLOWS.map((f) => (
                <button key={f.id} className={`chip ${log.flow === f.id ? 'is-on' : ''}`} onClick={() => pick('flow', f.id)}>{f.label}</button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3>Ánimo</h3>
          <div className="moods">
            {MOODS.map((m) => (
              <button key={m.id} className={`mood ${log.mood === m.id ? 'is-on' : ''}`} onClick={() => pick('mood', m.id)}>
                <span>{m.emoji}</span><small>{m.label}</small>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Síntomas</h3>
          <div className="chips">
            {SYMPTOMS.map((s) => (
              <button key={s} className={`chip ${log.symptoms.includes(s) ? 'is-on' : ''}`} onClick={() => toggleSymptom(s)}>
                <span aria-hidden="true">{SYMPTOM_EMOJI[s]}</span> {s}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Relaciones sexuales</h3>
          <div className="chips">
            {SEX.map((s) => (
              <button key={s.id} className={`chip ${log.sex === s.id ? 'is-on' : ''}`} onClick={() => pick('sex', s.id)}>♥ {s.label}</button>
            ))}
            {log.sex && (
              <button className={`chip ${log.orgasm ? 'is-on' : ''}`} onClick={() => set({ orgasm: !log.orgasm })}>✨ Orgasmo</button>
            )}
          </div>
        </section>

        {state.settings.reminders.pill.on && (
          <label className="switch-row">
            <span>💊 Tomé la píldora</span>
            <input type="checkbox" checked={log.pill} onChange={(e) => set({ pill: e.target.checked })} />
          </label>
        )}

        <section className="num-row">
          <NumberField id="log-weight" label="Peso" unit="kg" step="0.1" min="20" max="300" value={log.weight} onChange={(v) => set({ weight: v })} />
          <NumberField id="log-temp" label="Temperatura" unit="°C" step="0.01" min="34" max="42" value={log.temp} onChange={(v) => set({ temp: v })} />
        </section>

        {state.role === 'self' && (
          <section>
            <h3>Nota para tu pareja 💌</h3>
            <textarea id="log-partner-note" rows="2" value={log.partnerNote ?? ''} maxLength={500}
              placeholder="Algo que quieras que sepa hoy…" aria-label="Nota para tu pareja"
              onChange={(e) => set({ partnerNote: e.target.value })} />
            <p className="muted small">
              {state.sharing.shares.notes ? 'La ve tu pareja (y le llega una notificación).' : 'Tenés desactivado compartir notas en Ajustes → Modo pareja.'}
            </p>
          </section>
        )}

        <section>
          <h3>Notas privadas 🔒</h3>
          <textarea id="log-note" rows="3" value={log.note} placeholder="¿Algo más que quieras recordar?"
            onChange={(e) => set({ note: e.target.value })} />
        </section>

        <button className="btn btn--primary btn--block" onClick={save}>Guardar</button>
      </div>
    </div>
  );
}
