import { monthMatrix, MONTHS, WEEKDAYS, fromISO } from '../lib/dates.js';
import { dayStatus, cycleDayOf } from '../lib/cycle.js';
import { useStore } from '../state/store.jsx';

/**
 * Info de cada día. Por defecto usa los datos propios; `data` permite mostrar los de otra persona
 * (vista de la pareja). `hideFertile` oculta fertilidad/ovulación si ella no la comparte.
 */
function useDayInfo(data, hideFertile = false) {
  const store = useStore();
  const d = data ?? {
    periodDays: store.state.periodDays, periods: store.periods, predictions: store.predictions,
    settings: store.state.settings, logs: store.state.logs,
  };
  return (iso) => {
    let status = dayStatus(iso, d);
    if (hideFertile && (status === 'fertile' || status === 'ovulation')) status = null;
    return { status, cycleDay: cycleDayOf(iso, d.periods, d.predictions), log: d.logs?.[iso] };
  };
}

// Agrupa estados en "bandas": el período real, el previsto y la ventana fértil (incluye la ovulación)
const BAND = { period: 'period', predicted: 'predicted', fertile: 'fertile', ovulation: 'fertile' };

export function MonthGrid({ year, month, selected, editing, onSelect, data, hideFertile }) {
  const { today } = useStore();
  const info = useDayInfo(data, hideFertile);
  const weeks = monthMatrix(year, month);
  return (
    <div className={`cal ${editing ? 'is-editing' : ''}`}>
      <div className="cal__wds">{WEEKDAYS.map((w) => <span key={w} className="cal__wd">{w}</span>)}</div>
      <div className="cal__grid">
        {weeks.map((week) => {
          const infos = week.map((iso) => (fromISO(iso).getUTCMonth() === month ? info(iso) : null));
          return week.map((iso, col) => {
            const d = infos[col];
            if (!d) return <span key={iso} className="cal__day is-outside" aria-hidden="true" />;
            const band = BAND[d.status];
            const prevBand = col > 0 && infos[col - 1] ? BAND[infos[col - 1].status] : null;
            const nextBand = col < 6 && infos[col + 1] ? BAND[infos[col + 1].status] : null;
            const cls = ['cal__day', d.status && `is-${d.status}`, band && `band band--${band}`,
              band && prevBand !== band && 'band--start', band && nextBand !== band && 'band--end',
              iso === today && 'is-today', iso === selected && 'is-selected', editing && iso > today && 'is-disabled'].filter(Boolean).join(' ');
            return (
              <button key={iso} className={cls} onClick={() => onSelect(iso)} aria-label={iso}
                disabled={editing && iso > today} aria-pressed={editing ? d.status === 'period' : undefined}
                aria-current={iso === today ? 'date' : undefined}>
                <span className="cal__num">{fromISO(iso).getUTCDate()}</span>
                <span className="cal__cd">{d.cycleDay ?? ''}</span>
                <span className="cal__marks">
                  {d.log?.sex && <i className="mark mark--heart">♥</i>}
                  {d.log && (d.log.symptoms?.length || d.log.mood || d.log.note || d.log.partnerNote) ? <i className="mark mark--dot" /> : null}
                </span>
              </button>
            );
          });
        })}
      </div>
    </div>
  );
}

export function YearGrid({ year, onPickMonth }) {
  const { today } = useStore();
  const current = fromISO(today);
  const info = useDayInfo();
  return (
    <div className="year">
      {MONTHS.map((name, m) => (
        <button key={name} className={`year__month ${year === current.getUTCFullYear() && m === current.getUTCMonth() ? 'is-current' : ''}`}
          onClick={() => onPickMonth(m)} aria-label={`${name} ${year}`}>
          <strong>{name.slice(0, 3)}</strong>
          <div className="year__grid">
            {monthMatrix(year, m).flat().map((iso) => {
              if (fromISO(iso).getUTCMonth() !== m) return <i key={iso} />;
              const { status } = info(iso);
              return <i key={iso} className={`y ${status ? `is-${status}` : ''} ${iso === today ? 'is-today' : ''}`} />;
            })}
          </div>
        </button>
      ))}
    </div>
  );
}

export function Legend({ hideFertile = false }) {
  return (
    <div className="legend">
      <span><i className="lg lg--period" />Período</span>
      <span><i className="lg lg--predicted" />Previsto</span>
      {!hideFertile && <span><i className="lg lg--fertile" />Fértil</span>}
      {!hideFertile && <span><i className="lg lg--ovulation" />Ovulación</span>}
    </div>
  );
}
