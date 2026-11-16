import { FLOWS, MOODS, SEX, SYMPTOM_EMOJI } from './DayLogSheet.jsx';

/** Lo que ella compartió de un día (solo los campos que habilitó). */
export default function SharedDay({ day, name, emptyText }) {
  if (!day) return emptyText ? <p className="muted small">{emptyText}</p> : null;
  const mood = MOODS.find((m) => m.id === day.mood);
  return (
    <div className="stack-sm">
      {day.partnerNote && (
        <blockquote className="love-note">
          <span className="muted small">💌 {name} te dejó una nota</span>
          <p>“{day.partnerNote}”</p>
        </blockquote>
      )}
      <div className="chips">
        {day.flow && <span className="chip is-on">🩸 {FLOWS.find((f) => f.id === day.flow)?.label}</span>}
        {mood && <span className="chip">{mood.emoji} {mood.label}</span>}
        {day.sex && <span className="chip">♥ {SEX.find((x) => x.id === day.sex)?.label}{day.orgasm ? ' · ✨' : ''}</span>}
        {(day.symptoms ?? []).map((x) => <span key={x} className="chip">{SYMPTOM_EMOJI[x] ?? '•'} {x}</span>)}
        {day.weight && <span className="chip">{day.weight} kg</span>}
        {day.temp && <span className="chip">{day.temp} °C</span>}
      </div>
    </div>
  );
}
