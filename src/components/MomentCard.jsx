import { useStore } from '../state/store.jsx';
import { MOMENTS, timeAgo } from '../lib/partner.js';
import { CoupleAvatars } from './Avatar.jsx';

/** "Mi momento": ella comparte cómo se siente y su deseo. */
export default function MomentCard() {
  const { state, today, shareMoment, setDesire } = useStore();
  const linked = state.cloud.status === 'active';
  const { moments, desire, name } = state.sharing;
  const last = moments.at(-1);
  const current = last && last.at.slice(0, 10) === today ? last.id : null;
  const level = desire?.level ?? 50;
  const desireText = level < 34 ? 'Bajo' : level < 67 ? 'Medio' : 'Alto';

  return (
    <div className="card stack moment-card">
      <div className={linked ? 'row' : ''}>
        {linked && (
          <CoupleAvatars me={{ photo: state.profile.photo, name }} size={40}
            partner={{ photo: state.partnerProfile.photo, name: state.partnerProfile.name }} />
        )}
        <div className="grow">
        <h2 className="card__title">{linked ? `Compartiendo con ${state.partnerProfile.name || 'tu pareja'}` : 'Mi momento 💞'}</h2>
        <p className="muted small">
          {last ? `Compartido ${timeAgo(last.at)}. ` : ''}
          {linked ? 'Contale cómo te sentís: lo ve al instante.' : `Tu pareja lo verá cuando la vincules${name ? '' : ' (poné tu nombre en Ajustes)'}.`}
        </p>
        </div>
      </div>
      <div className="chips">
        {MOMENTS.map((m) => (
          <button key={m.id} className={`chip chip--moment ${current === m.id ? 'is-on' : ''}`}
            onClick={() => shareMoment(m.id)} aria-pressed={current === m.id}>
            <span aria-hidden="true">{m.emoji}</span> {m.label}
          </button>
        ))}
      </div>
      <label className="desire" htmlFor="desire">
        <span className="row row--between"><span className="muted small">Mi deseo</span><strong>{desireText}</strong></span>
        <input id="desire" type="range" min="0" max="100" step="1" value={level}
          onChange={(e) => setDesire(Number(e.target.value))} aria-label="Mi deseo" />
        <span className="row row--between desire__scale"><small>BAJO</small><small>ALTO</small></span>
      </label>
    </div>
  );
}
