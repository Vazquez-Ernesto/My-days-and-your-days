import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { formatLong } from '../lib/dates.js';
import { startPeriod } from '../lib/cycle.js';

export const FLOWS = [
  { id: 'spotting', label: 'Manchado' },
  { id: 'light', label: 'Leve' },
  { id: 'medium', label: 'Medio' },
  { id: 'heavy', label: 'Abundante' },
];
export const SYMPTOMS = ['Cólicos', 'Dolor de cabeza', 'Hinchazón', 'Acné', 'Sensibilidad mamaria',
  'Cansancio', 'Antojos', 'Náuseas', 'Dolor lumbar', 'Insomnio'];
export const MOODS = [
  { id: 'happy', emoji: '😊', label: 'Feliz' },
  { id: 'calm', emoji: '😌', label: 'Tranquila' },
  { id: 'sensitive', emoji: '🥺', label: 'Sensible' },
  { id: 'sad', emoji: '😢', label: 'Triste' },
  { id: 'irritable', emoji: '😤', label: 'Irritable' },
  { id: 'anxious', emoji: '😰', label: 'Ansiosa' },
];

export default function DayLogSheet({ date, onClose }) {
  const { state, saveLog, setPeriodDays } = useStore();
  const [log, setLog] = useState(state.logs[date] ?? { flow: null, symptoms: [], mood: null, note: '' });
  const isPeriod = state.periodDays.includes(date);

  const togglePeriod = () => {
    if (isPeriod) {
      setPeriodDays(state.periodDays.filter((d) => d !== date));
      setLog((l) => ({ ...l, flow: null }));
    } else {
      setPeriodDays(startPeriod(state.periodDays, date, 1));
    }
  };
  const toggleSymptom = (s) => setLog((l) => ({
    ...l, symptoms: l.symptoms.includes(s) ? l.symptoms.filter((x) => x !== s) : [...l.symptoms, s],
  }));
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
          <>
            <h3>Flujo</h3>
            <div className="chips">
              {FLOWS.map((f) => (
                <button key={f.id} className={`chip ${log.flow === f.id ? 'is-on' : ''}`}
                  onClick={() => setLog((l) => ({ ...l, flow: l.flow === f.id ? null : f.id }))}>{f.label}</button>
              ))}
            </div>
          </>
        )}

        <h3>Ánimo</h3>
        <div className="moods">
          {MOODS.map((m) => (
            <button key={m.id} className={`mood ${log.mood === m.id ? 'is-on' : ''}`}
              onClick={() => setLog((l) => ({ ...l, mood: l.mood === m.id ? null : m.id }))}>
              <span>{m.emoji}</span><small>{m.label}</small>
            </button>
          ))}
        </div>

        <h3>Síntomas</h3>
        <div className="chips">
          {SYMPTOMS.map((s) => (
            <button key={s} className={`chip ${log.symptoms.includes(s) ? 'is-on' : ''}`}
              onClick={() => toggleSymptom(s)}>{s}</button>
          ))}
        </div>

        <h3>Notas</h3>
        <textarea rows="3" value={log.note} placeholder="¿Algo más que quieras recordar?"
          onChange={(e) => setLog((l) => ({ ...l, note: e.target.value }))} />

        <button className="btn btn--primary btn--block" onClick={save}>Guardar</button>
      </div>
    </div>
  );
}
