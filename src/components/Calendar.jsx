import { monthMatrix, MONTHS, WEEKDAYS, fromISO } from '../lib/dates.js';
import { dayStatus, cycleDayOf } from '../lib/cycle.js';
import { useStore } from '../state/store.jsx';
import { dayMarkers, cellMarkers, MARKER_LEGEND } from '../lib/dayMarkers.js';

const STATUS_TEXT = { period: 'Período', predicted: 'Período previsto', fertile: 'Ventana fértil', ovulation: 'Ovulación prevista' };

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

export function MonthGrid({ year, month, selected, editing, onSelect, data, hideFertile, viewer = 'self' }) {
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
            const date = fromISO(iso);
            const markers = dayMarkers(d.log, viewer);
            const { shown, more } = cellMarkers(markers);
            // guía `accessibility`: el nombre incluye el texto visible ("21"); lo demás va como descripción
            const description = [STATUS_TEXT[d.status], d.cycleDay && `día ${d.cycleDay} del ciclo`, ...markers.map((m) => m.label)]
              .filter(Boolean).join('. ');
            return (
              <button key={iso} className={cls} onClick={() => onSelect(iso)} data-date={iso}
                aria-label={`${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()].toLowerCase()}`}
                aria-description={description || undefined}
                disabled={editing && iso > today} aria-pressed={editing ? d.status === 'period' : undefined}
                aria-current={iso === today ? 'date' : undefined}>
                <span className="cal__num">{date.getUTCDate()}</span>
                <span className="cal__cd">{d.cycleDay ?? ''}</span>
                {shown.length > 0 && (
                  <span className="cal__marks" aria-hidden="true">
                    {shown.map((m) => <i key={m.key} className={`mark mark--${m.key}`}>{m.emoji}</i>)}
                    {more > 0 && <i className="mark mark--more">+{more}</i>}
                  </span>
                )}
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

/** Colores siempre a la vista + "¿Qué significa cada ícono?" en un <details> nativo (guía `search-hidden-content`). */
export function Legend({ hideFertile = false, viewer = 'self' }) {
  const icons = MARKER_LEGEND.filter((l) => viewer === 'self' || !l.private)
    .map((l) => (viewer === 'partner' && l.key === 'partnerNote' ? { ...l, text: 'Nota que te dejó' } : l));
  return (
    <div className="legend-wrap">
      <ul className="legend" aria-label="Colores del calendario">
        <li><i className="lg lg--period" aria-hidden="true" />Período</li>
        <li><i className="lg lg--predicted" aria-hidden="true" />Previsto</li>
        {!hideFertile && <li><i className="lg lg--fertile" aria-hidden="true" />Fértil</li>}
        {!hideFertile && <li><i className="lg lg--ovulation" aria-hidden="true" />Ovulación</li>}
        <li><i className="lg lg--today" aria-hidden="true" />Hoy</li>
      </ul>
      <details className="legend-more">
        <summary>¿Qué significa cada ícono?</summary>
        <ul className="legend-icons">
          {icons.map((l) => (
            <li key={l.key}><span className="legend-icons__emoji" aria-hidden="true">{l.emoji}</span>{l.text}</li>
          ))}
          <li><span className="legend-icons__emoji legend-icons__more" aria-hidden="true">+2</span>Hay más registros ese día (tocalo para verlos)</li>
          <li><span className="legend-icons__emoji legend-icons__num" aria-hidden="true">14</span>El número chiquito es el día de tu ciclo</li>
        </ul>
      </details>
    </div>
  );
}
