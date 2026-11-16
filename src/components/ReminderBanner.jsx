import { useStore } from '../state/store.jsx';
import Icon from './Icons.jsx';

const ICON = { pill: 'pill', appointment: 'stethoscope', fertile: 'egg', ovulation: 'egg', reply: 'heart' };

export default function ReminderBanners() {
  const { reminders, today, patchLog, markRepliesSeen } = useStore();
  if (!reminders.length) return null;
  return (
    <div className="stack">
      {reminders.map((r) => (
        <div key={r.id} className={`card reminder reminder--${r.type}`} role="status">
          <span className="reminder__icon"><Icon name={ICON[r.type] ?? 'bell'} /></span>
          <div className="grow"><strong>{r.title}</strong><p className="muted small">{r.body}</p></div>
          {r.type === 'reply' && (
            <button className="btn btn--primary btn--small" onClick={markRepliesSeen}>💗 Visto</button>
          )}
          {r.type === 'pill' && (
            <button className="btn btn--primary btn--small" onClick={() => patchLog(today, { pill: true })}>Tomada</button>
          )}
        </div>
      ))}
    </div>
  );
}
