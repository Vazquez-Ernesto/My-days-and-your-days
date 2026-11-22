// Gráficos de My Days, hechos con HTML + SVG (sin librerías).
// Reglas (skill `dataviz`): marcas finas, grilla tenue, un solo color por serie,
// etiquetas selectivas, tooltip al pasar o enfocar, y siempre una tabla equivalente.
import { useId } from 'react';
import { niceTicks, heatLevel } from '../lib/stats.js';

/** El tooltip se alinea hacia adentro en los bordes, así nunca sale del gráfico. */
function tipSide(pct) {
  if (pct < 30) return 'chart__tip--start';
  if (pct > 70) return 'chart__tip--end';
  return '';
}

/** Tabla equivalente del gráfico (para lectores de pantalla o para ver los números exactos). */
export function DataTable({ caption, columns, rows }) {
  return (
    <details className="chart-table">
      <summary>Ver como tabla</summary>
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>{r.map((v, i) => (i === 0 ? <th key={i} scope="row">{v}</th> : <td key={i}>{v}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/**
 * Línea en el tiempo con banda de referencia (ej. rango típico del ciclo).
 * points: [{ key, x: etiqueta corta, y: número, label: texto completo para tooltip/lector }]
 */
export function LineChart({ points, band, unit, title }) {
  const ys = points.map((p) => p.y);
  const lo = Math.min(...ys, band ? band.min : Infinity) - 2;
  const hi = Math.max(...ys, band ? band.max : -Infinity) + 2;
  const ticks = niceTicks(lo, hi);
  const min = ticks[0];
  const max = ticks.at(-1);
  const top = (v) => ((max - v) / (max - min)) * 100;
  const left = (i) => (points.length === 1 ? 50 : 4 + (i / (points.length - 1)) * 92);
  const every = points.length > 6 ? 2 : 1; // menos etiquetas en el eje si no entran

  return (
    <figure className="chart" aria-label={title}>
      <div className="chart__plot chart__plot--line">
        <div className="chart__y" aria-hidden="true">
          {ticks.map((t) => <span key={t} style={{ top: `${top(t)}%` }}>{t}</span>)}
        </div>
        <div className="chart__area">
          {ticks.map((t) => <i key={t} className="chart__grid" style={{ top: `${top(t)}%` }} aria-hidden="true" />)}
          {band && (
            <i className="chart__band" aria-hidden="true"
              style={{ top: `${top(band.max)}%`, height: `${top(band.min) - top(band.max)}%` }}>
              <span>{band.label}</span>
            </i>
          )}
          <svg className="chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={points.map((p, i) => `${left(i)},${top(p.y)}`).join(' ')} />
          </svg>
          {points.map((p, i) => (
            <button key={p.key} type="button" className="chart__dot" style={{ left: `${left(i)}%`, top: `${top(p.y)}%` }}
              aria-label={p.label}>
              <span className={`chart__tip ${tipSide(left(i))}`} aria-hidden="true">{p.label}</span>
            </button>
          ))}
          {/* etiqueta directa solo en el último punto */}
          <span className="chart__end" aria-hidden="true"
            style={{ left: `${left(points.length - 1)}%`, top: `${top(points.at(-1).y)}%` }}>{points.at(-1).y} {unit}</span>
        </div>
      </div>
      <div className="chart__x" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.key} style={{ left: `${left(i)}%` }}>{(points.length - 1 - i) % every === 0 ? p.x : ''}</span>
        ))}
      </div>
    </figure>
  );
}

/** Columnas desde cero (magnitudes). bars: [{ key, x, y, label }] */
export function ColumnChart({ bars, unit, title, minMax = 7 }) {
  const ticks = niceTicks(0, Math.max(minMax, ...bars.map((b) => b.y)), Math.max(...bars.map((b) => b.y)) > 10 ? 5 : 2);
  const max = ticks.at(-1);
  return (
    <figure className="chart" aria-label={title}>
      <div className="chart__plot chart__plot--cols">
        <div className="chart__y" aria-hidden="true">
          {ticks.map((t) => <span key={t} style={{ top: `${((max - t) / max) * 100}%` }}>{t}</span>)}
        </div>
        <div className="chart__area chart__cols">
          {ticks.map((t) => <i key={t} className="chart__grid" style={{ top: `${((max - t) / max) * 100}%` }} aria-hidden="true" />)}
          {bars.map((b, i) => (
            <div key={b.key} className="chart__col">
              <button type="button" className="chart__bar" style={{ height: `${(b.y / max) * 100}%` }} aria-label={b.label}>
                <span className={`chart__tip ${tipSide(((i + 0.5) / bars.length) * 100)}`} aria-hidden="true">{b.label}</span>
                {i === bars.length - 1 && <span className="chart__cap" aria-hidden="true">{b.y} {unit}</span>}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="chart__x chart__x--cols" aria-hidden="true">
        {bars.map((b, i) => <span key={b.key}>{bars.length > 6 && (bars.length - 1 - i) % 2 ? '' : b.x}</span>)}
      </div>
    </figure>
  );
}

/** Mapa de calor: filas × columnas con un solo tono (más oscuro = más). Es una tabla real. */
export function Heatmap({ caption, columns, rows }) {
  const id = useId();
  return (
    <div className="heat-wrap">
      <table className="heat" aria-describedby={`${id}-legend`}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr><th scope="col"><span className="visually-hidden">Síntoma</span></th>{columns.map((c) => <th key={c.id} scope="col">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              {columns.map((c) => {
                const v = r.values[c.id];
                return <td key={c.id} className={`heat__cell heat--${heatLevel(v)}`}>{v ? `${v}%` : <span aria-label="0%">·</span>}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="heat-legend" id={`${id}-legend`}>
        <span>Menos</span>
        {[1, 2, 3, 4].map((l) => <i key={l} className={`heat--${l}`} aria-hidden="true" />)}
        <span>Más</span>
      </p>
    </div>
  );
}

/** Barras horizontales ordenadas (meter list): nombre, barra y cantidad. */
export function RankedBars({ items, title }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="ranked" aria-label={title}>
      {items.map((it) => (
        <li key={it.key}>
          <span className="ranked__name"><span aria-hidden="true">{it.icon}</span> {it.name}</span>
          <span className="ranked__track" aria-hidden="true"><i style={{ width: `${(it.value / max) * 100}%` }} /></span>
          <span className="ranked__value">{it.value}<span className="visually-hidden"> {it.unit}</span></span>
        </li>
      ))}
    </ul>
  );
}
