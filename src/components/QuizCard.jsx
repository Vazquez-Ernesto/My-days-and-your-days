import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { quizStatus } from '../lib/quiz.js';

function untilMidnight(now) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((end - now) / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

export function useQuizAvailable() {
  const { state } = useStore();
  if (state.role === 'partner') return Boolean(state.cloud.pairId && state.partner.snapshot && !state.partner.snapshot.demo && !state.partner.unlinked);
  return state.cloud.status === 'active';
}

/** Tarjeta en Hoy: estado del cuestionario del día y cuenta regresiva hasta medianoche. */
export default function QuizCard({ onOpen }) {
  const { state, today } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const available = useQuizAvailable();
  if (!available) return null;
  const status = quizStatus(state.quiz.days[today]);
  const partnerName = state.role === 'partner' ? state.partner.snapshot?.name : state.quiz.days[today]?.theirName || state.partnerProfile.name || 'tu pareja';
  const text = {
    todo: '5 preguntas para conocerse más',
    waiting: `Esperando que ${partnerName} responda…`,
    done: '¡Ya están los resultados! 🔥',
  }[status];

  return (
    <button className={`card quiz-card quiz-card--${status}`} onClick={onOpen} aria-label="Cuestionario en pareja">
      <div className="grow">
        <h2 className="card__title">Cuestionario en pareja 💬</h2>
        <p className="small">{text}</p>
      </div>
      <span className="quiz-card__timer" aria-label="Tiempo restante">{untilMidnight(now)}</span>
      <span className="quiz-card__go" aria-hidden="true">→</span>
    </button>
  );
}
