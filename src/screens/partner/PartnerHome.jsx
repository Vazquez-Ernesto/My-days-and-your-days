import { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import CycleRing from '../../components/CycleRing.jsx';
import CycleTimeline from '../../components/CycleTimeline.jsx';
import Header from '../../components/Header.jsx';
import Icon from '../../components/Icons.jsx';
import { SYMPTOM_EMOJI } from '../../components/DayLogSheet.jsx';
import { PHASES, pregnancyChance } from '../../lib/cycle.js';
import { snapshotView, latestMoment, partnerTips, timeAgo, REPLIES } from '../../lib/partner.js';
import { CHANCE_TEXT } from '../Home.jsx';

const PARTNER_PHASE = {
  menstrual: 'Está con su período', follicular: 'Fase folicular', fertile: 'Fase fértil',
  ovulation: 'Día de ovulación', luteal: 'Fase lútea (premenstrual)', late: 'Su período está atrasado',
};

/**
 * Lo que ve ÉL. `preview` = ella mirando cómo la ve su pareja (sin avisos ni respuestas).
 */
export default function PartnerHome({ snapshot, preview = false, onSettings, onClose, onSync, syncError }) {
  const { today, reminders, markMomentSeen, sendReply, state, unlinkPartner } = useStore();
  const online = !snapshot.demo && Boolean(state.cloud.pairId);
  const [sent, setSent] = useState(null);
  const view = snapshotView(snapshot, today);
  const s = view?.summary;
  const name = snapshot.name;
  const moment = latestMoment(snapshot);
  const showFertile = Boolean(snapshot.shares?.fertile);
  const symptomsToday = snapshot.days?.[today]?.symptoms ?? [];
  const tips = partnerTips({ summary: s, symptomsToday, moment });

  const reply = (text) => {
    sendReply(text);
    if (moment) markMomentSeen(moment.at);
    setSent(text);
  };

  let big, small;
  if (s) {
    if (s.onPeriod) { big = `Día ${s.periodDay}`; small = 'de su período'; }
    else if (s.phase === 'late') { big = `${-s.daysUntilNext}`; small = `día${s.daysUntilNext === -1 ? '' : 's'} de atraso`; }
    else if (s.daysUntilNext === 0) { big = 'Hoy'; small = 'podría llegar su período'; }
    else { big = `${s.daysUntilNext}`; small = `día${s.daysUntilNext === 1 ? '' : 's'} para su período`; }
  }

  if (!preview && state.partner.unlinked) {
    return (
      <section className="screen">
        <Header title="My Days" onSettings={onSettings} />
        <div className="card center stack">
          <div className="hero-emoji">💔</div>
          <h2>Ya no estás vinculado</h2>
          <p className="muted">Tu pareja terminó el vínculo, así que ya no podés ver su ciclo.</p>
          <button className="btn btn--primary" onClick={unlinkPartner}>Volver al inicio</button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      {preview ? (
        <Header title="Lo que ve tu pareja" onBack={onClose} />
      ) : (
        <Header title={name} onSettings={onSettings} />
      )}

      <div className="partner-head">
        <span className="avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
        <div className="grow">
          <strong>{preview ? `Así te ve tu pareja, ${name}` : `Compartiendo con ${name}`}</strong>
          <p className="muted small">
            {snapshot.waiting ? 'Vinculado ✓' : `Actualizado ${timeAgo(snapshot.updatedAt)}`}{snapshot.demo ? ' · datos de ejemplo' : ''}
          </p>
        </div>
        {online && !preview && <button className="btn btn--soft btn--small" onClick={onSync}>Actualizar</button>}
      </div>
      {online && syncError && <p className="notice notice--error" role="alert">No pudimos actualizar: revisá tu conexión.</p>}

      {snapshot.waiting && (
        <div className="card center stack" role="status">
          <p><strong>¡Listo, ya están vinculados! 💞</strong></p>
          <p className="muted small">Esperando que tu pareja abra My Days para compartir sus datos. Se actualiza solo.</p>
        </div>
      )}

      {!preview && reminders.filter((r) => r.type !== 'moment').map((r) => (
        <div key={r.id} className="card reminder" role="status">
          <span className="reminder__icon"><Icon name="bell" /></span>
          <div className="grow"><strong>{r.title}</strong><p className="muted small">{r.body}</p></div>
        </div>
      ))}

      {moment && (
        <div className="card stack partner-moment" role={!preview && reminders.some((r) => r.type === 'moment') ? 'status' : undefined}>
          <div className="row">
            <span className="partner-moment__emoji" aria-hidden="true">{moment.emoji}</span>
            <div className="grow">
              <p className="muted small">Su momento · {timeAgo(moment.at)}</p>
              <strong className="partner-moment__label">{moment.label}</strong>
            </div>
          </div>
          {snapshot.desire && (
            <div className="desire-view">
              <span className="muted small">Su deseo</span>
              <div className="desire-view__bar"><i style={{ width: `${snapshot.desire.level}%` }} /></div>
            </div>
          )}
          {!preview && (
            sent ? (
              <p className="notice" role="status">
                {online
                  ? (state.partner.replies.at(-1)?.sent ? `Enviaste “${sent}” ✓` : `Enviando “${sent}”…`)
                  : `Enviaste “${sent}”. 🧪 Con datos de ejemplo no se envía a nadie.`}
              </p>
            ) : (
              <>
                <p className="muted small">Respondele con un toque:</p>
                <div className="chips">
                  {REPLIES.map((r) => <button key={r} className="chip" onClick={() => reply(r)}>{r}</button>)}
                </div>
              </>
            )
          )}
        </div>
      )}

      {s ? (
        <>
          <CycleRing summary={s} hideFertile={!showFertile}>
            <span className="ring__big">{big}</span>
            <span className="ring__small">{small}</span>
            <span className="ring__day">Día {s.cycleDay} de su ciclo</span>
          </CycleRing>
          <div className="card stack">
            <div>
              <h2 className="card__title">{PARTNER_PHASE[s.phase]}</h2>
              {showFertile && <p className={`chance chance--${pregnancyChance(s.cycleDay, s.cycleLength, s.periodLength)}`}>
                {CHANCE_TEXT[pregnancyChance(s.cycleDay, s.cycleLength, s.periodLength)]}</p>}
              {!showFertile && <p className="muted small">{PHASES[s.phase].tip}</p>}
            </div>
            <CycleTimeline summary={s} start={view.periods.at(-1).start} hideFertile={!showFertile} />
          </div>
        </>
      ) : !snapshot.waiting && (
        <div className="card center"><p className="muted">{name} no comparte su ciclo por ahora.</p></div>
      )}

      {tips.length > 0 && (
        <div className="card stack tips">
          <h2 className="card__title">Cómo acompañarla hoy</h2>
          <ul>{tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}

      {symptomsToday.length > 0 && (
        <div className="card stack">
          <h2 className="card__title">Cómo se siente hoy</h2>
          <div className="chips">{symptomsToday.map((x) => <span key={x} className="chip">{SYMPTOM_EMOJI[x]} {x}</span>)}</div>
        </div>
      )}

      {!preview && state.partner.replies.length > 0 && (
        <p className="muted small center">Le enviaste {state.partner.replies.length} mensaje{state.partner.replies.length === 1 ? '' : 's'}.</p>
      )}
    </section>
  );
}
