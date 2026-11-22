import { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import CycleRing from '../../components/CycleRing.jsx';
import CycleTimeline from '../../components/CycleTimeline.jsx';
import Header from '../../components/Header.jsx';
import Icon from '../../components/Icons.jsx';
import QuizCard from '../../components/QuizCard.jsx';
import SharedDay from '../../components/SharedDay.jsx';
import { CoupleAvatars } from '../../components/Avatar.jsx';
import Mascot, { PHASE_MOOD } from '../../components/Mascot.jsx';
import { PHASES, pregnancyChance, nextFertileWindow } from '../../lib/cycle.js';
import { snapshotView, latestMoment, partnerTips, timeAgo, visiblePhase, REPLIES } from '../../lib/partner.js';
import { formatShort, diffDays } from '../../lib/dates.js';
import { CHANCE_TEXT, Greeting, PHASE_SHORT } from '../Home.jsx';

const PARTNER_PHASE = {
  menstrual: 'Está con su período', follicular: 'Fase folicular', fertile: 'Fase fértil',
  ovulation: 'Día de ovulación', luteal: 'Fase lútea (premenstrual)', late: 'Su período está atrasado',
};

/**
 * Lo que ve ÉL. `preview` = ella mirando cómo la ve su pareja (sin avisos ni respuestas).
 */
export default function PartnerHome({ snapshot, preview = false, onSettings, onClose, onSync, syncError, onQuiz }) {
  const { today, reminders, markMomentSeen, sendReply, state, unlinkPartner } = useStore();
  const [sent, setSent] = useState(null);
  const online = !snapshot.demo && Boolean(state.cloud.pairId);
  const view = snapshotView(snapshot, today);
  const s = view?.summary;
  const name = snapshot.name;
  const moment = latestMoment(snapshot);
  const showFertile = Boolean(snapshot.shares?.fertile);
  const symptomsToday = snapshot.days?.[today]?.symptoms ?? [];
  const phase = visiblePhase(s, showFertile); // sin permiso, nunca "fértil" ni "ovulación"
  const tips = partnerTips({ summary: s && { ...s, phase }, symptomsToday, moment });
  const next = view?.predictions?.[0];
  const fertile = view && showFertile ? nextFertileWindow(view.periods, view.settings, view.predictions, today) : null;
  const me = preview
    ? { photo: state.partnerProfile.photo, name: state.partnerProfile.name || 'Tu pareja' }
    : { photo: state.profile.photo, name: state.partner.myName };
  const her = preview
    ? { photo: state.profile.photo, name }
    : { photo: state.partnerProfile.photo, name: state.partnerProfile.name || name };

  const reply = (text) => {
    sendReply(text);
    if (moment) markMomentSeen(moment.at);
    setSent(text);
  };

  if (!preview && state.partner.unlinked) {
    return (
      <section className="screen">
        <Header title="My Days" onSettings={onSettings} />
        <div className="card center stack">
          <Mascot mood="sad" size={110} className="center-block" />
          <h2>Ya no estás vinculado</h2>
          <p className="muted">Tu pareja terminó el vínculo, así que ya no podés ver su ciclo.</p>
          <button className="btn btn--primary" onClick={unlinkPartner}>Volver al inicio</button>
        </div>
      </section>
    );
  }

  let big, small;
  if (s) {
    if (s.onPeriod) { big = `Día ${s.periodDay}`; small = 'de su período'; }
    else if (s.phase === 'late') { big = `${-s.daysUntilNext}`; small = `día${s.daysUntilNext === -1 ? '' : 's'} de atraso`; }
    else if (s.daysUntilNext === 0) { big = 'Hoy'; small = 'podría llegar su período'; }
    else { big = `${s.daysUntilNext}`; small = `día${s.daysUntilNext === 1 ? '' : 's'} para su período`; }
  }

  return (
    <section className="screen">
      {preview
        ? <Header title="Lo que ve tu pareja" onBack={onClose} />
        : <Header title={<Greeting name={state.partner.myName?.trim()} today={today} />} onSettings={onSettings} />}

      <div className="card couple-card">
        <CoupleAvatars me={me} partner={her} size={46} />
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
          <Mascot mood="wait" size={90} className="center-block" />
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

      {s ? (
        <div className="hero">
          <CycleRing summary={s} hideFertile={!showFertile}>
            <span className={`phase-chip phase-chip--${phase}`}>{PHASE_SHORT[phase]}</span>
            <span className="ring__big">{big}</span>
            <span className="ring__small">{small}</span>
            <span className="ring__day">Día {s.cycleDay} de su ciclo</span>
          </CycleRing>
        </div>
      ) : !snapshot.waiting && (
        <div className="card center"><p className="muted">{name} no comparte su ciclo por ahora.</p></div>
      )}

      {(next || moment || fertile) && (
        <div className="widgets">
          {next && (
            <div className="widget widget--period">
              <span className="widget__icon"><Icon name="drop" size={18} /></span>
              <small>Su próximo período</small>
              <strong>{formatShort(next.periodStart)}</strong>
              <span className="widget__sub">en {diffDays(next.periodStart, today)} días</span>
            </div>
          )}
          {fertile ? (
            <div className="widget widget--fertile">
              <span className="widget__icon"><Icon name="egg" size={18} /></span>
              <small>Ventana fértil</small>
              <strong>{fertile.active ? 'En curso' : `En ${fertile.daysUntil} día${fertile.daysUntil === 1 ? '' : 's'}`}</strong>
              <span className="widget__sub">{formatShort(fertile.start)} – {formatShort(fertile.end)}</span>
            </div>
          ) : moment && (
            <div className="widget widget--mood">
              <span className="widget__icon widget__icon--emoji" aria-hidden="true">{moment.emoji}</span>
              <small>Su momento</small>
              <strong>{moment.label}</strong>
              <span className="widget__sub">{timeAgo(moment.at)}</span>
            </div>
          )}
        </div>
      )}

      {snapshot.days?.[today] && (
        <div className="card stack her-day">
          <h2 className="card__title">Su día hoy</h2>
          <SharedDay day={snapshot.days[today]} name={name} />
        </div>
      )}

      {!preview && <QuizCard onOpen={onQuiz} />}

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

      {tips.length > 0 && (
        <div className="card stack tips">
          <div className="row">
            <Mascot mood={phase ? PHASE_MOOD[phase] : 'love'} size={52} />
            <h2 className="card__title">Cómo acompañarla hoy</h2>
          </div>
          <ul>{tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}

      {s && (
        <div className="card stack">
          <div className="row row--between">
            <h2 className="card__title">{PARTNER_PHASE[phase]}</h2>
            {showFertile && (() => {
              const c = pregnancyChance(s.cycleDay, s.cycleLength, s.periodLength);
              return <span className={`chance-pill chance-pill--${c}`} title={CHANCE_TEXT[c]}>{c === 'alta' ? 'Fertilidad alta' : c === 'media' ? 'Fertilidad media' : 'Fertilidad baja'}</span>;
            })()}
          </div>
          <CycleTimeline summary={s} start={view.periods.at(-1).start} hideFertile={!showFertile} />
          <p className="muted small">{PHASES[phase].tip}</p>
        </div>
      )}

      {!preview && state.partner.replies.length > 0 && (
        <p className="muted small center">Le enviaste {state.partner.replies.length} mensaje{state.partner.replies.length === 1 ? '' : 's'}.</p>
      )}
    </section>
  );
}
