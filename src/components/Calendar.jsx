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

export function MonthGrid({ year, month, selected, editing, onSelect, data, hideFertile }) {
  const { today } = useStore();
  const info = useDayInfo(data, hideFertile);
  return (
    <div className={`cal ${editing ? 'is-editing' : ''}`}>
      <div className="cal__grid">
        {WEEKDAYS.map((w) => <span key={w} className="cal__wd">{w}</span>)}
        {monthMatrix(year, month).flat().map((iso) => {
          const outside = fromISO(iso).getUTCMonth() !== month;
          if (outside) return <span key={iso} className="cal__day is-outside" aria-hidden="true" />;
          const { status, cycleDay, log } = info(iso);
          const cls = ['cal__day', status && `is-${status}`, iso === today && 'is-today', iso === selected && 'is-selected',
            editing && iso > today && 'is-disabled'].filter(Boolean).join(' ');
          return (
            <button key={iso} className={cls} onClick={() => onSelect(iso)} aria-label={iso}
              disabled={editing && iso > today} aria-pressed={editing ? status === 'period' : undefined}>
              <span className="cal__num">{fromISO(iso).getUTCDate()}</span>
              {cycleDay && <span className="cal__cd">{cycleDay}</span>}
              <span className="cal__marks">
                {log?.sex && <i className="mark mark--heart">♥</i>}
                {log && (log.symptoms?.length || log.mood || log.note) ? <i className="mark mark--dot" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function YearGrid({ year, onPickMonth }) {
  const { today } = useStore();
  const info = useDayInfo();
  return (
    <div className="year">
      {MONTHS.map((name, m) => (
        <button key={name} className="year__month" onClick={() => onPickMonth(m)} aria-label={`${name} ${year}`}>
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
