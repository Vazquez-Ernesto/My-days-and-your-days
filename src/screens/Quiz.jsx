import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import Header from '../components/Header.jsx';
import { questionsFor, compare, syncLabel, quizStatus, QUESTIONS_PER_DAY } from '../lib/quiz.js';
import { formatShort } from '../lib/dates.js';

function Meter({ percent }) {
  return (
    <div className="meter" role="img" aria-label={`Sintonía ${percent}%`}>
      <svg viewBox="0 0 200 110">
        <path d="M20 100 A80 80 0 0 1 180 100" className="meter__track" />
        <path d="M20 100 A80 80 0 0 1 180 100" className="meter__fill" pathLength="100" style={{ strokeDasharray: `${percent} 100` }} />
      </svg>
      <strong className="meter__value">{percent}%</strong>
    </div>
  );
}

export default function Quiz({ onBack }) {
  const { state, today, answerQuiz } = useStore();
  const isPartner = state.role === 'partner';
  const myName = (isPartner ? state.partner.myName : state.sharing.name) || 'Vos';
  const entry = state.quiz.days[today];
  const theirName = (isPartner ? state.partner.snapshot?.name : entry?.theirName) || 'Tu pareja';
  const questions = questionsFor(state.cloud.pairId, today);
  const status = quizStatus(entry);
  const [step, setStep] = useState(status === 'todo' ? -1 : QUESTIONS_PER_DAY);
  const [answers, setAnswers] = useState([]);

  const choose = (i) => {
    const next = [...answers, i];
    setAnswers(next);
    if (next.length === QUESTIONS_PER_DAY) {
      answerQuiz(today, next);
      setStep(QUESTIONS_PER_DAY);
    } else {
      setStep(step + 1);
    }
  };

  const past = Object.entries(state.quiz.days)
    .filter(([d, v]) => d !== today && v.mine && v.theirs)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7);

  // --- respondiendo ---
  if (step >= 0 && step < QUESTIONS_PER_DAY) {
    const q = questions[step];
    return (
      <section className="screen quiz">
        <Header title={`Pregunta ${step + 1} de ${QUESTIONS_PER_DAY}`} onBack={onBack} />
        <div className="quiz__progress"><i style={{ width: `${(step / QUESTIONS_PER_DAY) * 100}%` }} /></div>
        <p className="muted small">{q.cat}</p>
        <h2 className="quiz__question">{q.q}</h2>
        <div className="quiz__options">
          {q.o.map((opt, i) => <button key={opt} className="quiz__option" onClick={() => choose(i)}>{opt}</button>)}
        </div>
      </section>
    );
  }

  // --- inicio, espera o resultados ---
  const result = entry?.mine && entry?.theirs ? compare(entry.mine, entry.theirs) : null;
  const label = result ? syncLabel(result.matches) : null;
  return (
    <section className="screen quiz">
      <Header title="Cuestionario del día" onBack={onBack} />

      {status === 'todo' && (
        <div className="card stack center">
          <div className="hero-emoji">💬</div>
          <h2>5 preguntas para conocerse más</h2>
          <p className="muted">No vas a ver lo que respondió {theirName} hasta que respondas vos. ¡Sin trampa!</p>
          <button className="btn btn--primary btn--block" onClick={() => setStep(0)}>Empezar</button>
        </div>
      )}

      {status !== 'todo' && (
        <div className="card quiz__people">
          <div><span className="avatar">{myName.slice(0, 1).toUpperCase()}</span><small>{myName}</small><small className="ok">Respondió ✓</small></div>
          <span className="quiz__heart" aria-hidden="true">♥</span>
          <div><span className="avatar">{theirName.slice(0, 1).toUpperCase()}</span><small>{theirName}</small>
            <small className={entry?.theirs ? 'ok' : 'muted'}>{entry?.theirs ? 'Respondió ✓' : 'Respuesta pendiente'}</small></div>
        </div>
      )}

      {status === 'waiting' && (
        <p className="notice center" role="status">
          ¡Listo! Cuando {theirName} responda, te avisamos y van a ver los resultados juntos 💞
        </p>
      )}

      {result && (
        <>
          <div className="card stack center" role="status">
            <Meter percent={result.percent} />
            <h2>{label.emoji} {label.title}</h2>
            <p className="muted">{label.text}</p>
            <p className="small">Coincidieron en <strong>{result.matches} de {QUESTIONS_PER_DAY}</strong></p>
          </div>
          <h2 className="section-title">Detalles</h2>
          {questions.map((q, i) => {
            const same = entry.mine[i] === entry.theirs[i];
            return (
              <div key={q.id} className={`card quiz__detail ${same ? 'is-same' : ''}`}>
                <p><strong>{i + 1}. {q.q}</strong></p>
                <div className="quiz__answer"><small className="muted">{myName}</small><span>{q.o[entry.mine[i]]}</span></div>
                <div className="quiz__answer"><small className="muted">{theirName}</small><span>{q.o[entry.theirs[i]]}</span></div>
                <p className="small">{same ? '✅ ¡Coincidieron!' : '💬 Pensaron distinto: ¿lo charlan?'}</p>
              </div>
            );
          })}
        </>
      )}

      {past.length > 0 && (
        <div className="card">
          <h2 className="card__title">Días anteriores</h2>
          <ul className="list">
            {past.map(([d, v]) => {
              const r = compare(v.mine, v.theirs);
              return <li key={d}><span>{formatShort(d)}</span><span>{syncLabel(r.matches).emoji} {r.percent}%</span></li>;
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
