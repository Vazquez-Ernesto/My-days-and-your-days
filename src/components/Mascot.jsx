// Luni: la mascota de My Days (una lunita creciente).
// SVG en línea (guía `icons`: inline SVG cuando hay que animar o estilizar su interior).
// Es DECORATIVA: siempre aria-hidden; la información la da el texto que la acompaña.
// Colores desde variables del tema (--luni-*), así funciona en claro y en noche.
import { useState } from 'react';

const EYES = {
  open: (
    <>
      <ellipse cx="38" cy="60" rx="4" ry="5" className="luni__ink" />
      <ellipse cx="56" cy="62" rx="4" ry="5" className="luni__ink" />
      <circle cx="39.5" cy="58" r="1.4" fill="#fff" />
      <circle cx="57.5" cy="60" r="1.4" fill="#fff" />
    </>
  ),
  closed: (
    <>
      <path d="M33 61 q5 4 10 0" className="luni__stroke" />
      <path d="M51 63 q5 4 10 0" className="luni__stroke" />
    </>
  ),
  happy: (
    <>
      <path d="M33 62 q5 -6 10 0" className="luni__stroke" />
      <path d="M51 64 q5 -6 10 0" className="luni__stroke" />
    </>
  ),
  sparkle: (
    <>
      <path d="M38 54 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6z" className="luni__ink" />
      <path d="M56 56 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6z" className="luni__ink" />
    </>
  ),
  worried: (
    <>
      <ellipse cx="38" cy="61" rx="3.6" ry="4.5" className="luni__ink" />
      <ellipse cx="56" cy="63" rx="3.6" ry="4.5" className="luni__ink" />
      <path d="M32 53 l9 -3" className="luni__stroke" />
      <path d="M61 55 l-9 -3" className="luni__stroke" />
    </>
  ),
};

const MOUTHS = {
  smile: <path d="M41 72 q7 7 14 1" className="luni__stroke" />,
  big: <path d="M40 71 q8 11 16 1 z" className="luni__ink" />,
  calm: <path d="M43 73 q5 3 10 0" className="luni__stroke" />,
  o: <ellipse cx="48" cy="74" rx="3" ry="3.6" className="luni__ink" />,
  sad: <path d="M42 76 q6 -5 12 0" className="luni__stroke" />,
};

/** Expresión + accesorios para cada estado de ánimo. */
const MOODS = {
  happy: { eyes: 'open', mouth: 'smile' },
  sleepy: { eyes: 'closed', mouth: 'calm', extra: 'zz' },
  sparkle: { eyes: 'sparkle', mouth: 'big', extra: 'stars' },
  calm: { eyes: 'happy', mouth: 'calm', extra: 'cloud' },
  worried: { eyes: 'worried', mouth: 'o' },
  sad: { eyes: 'worried', mouth: 'sad', extra: 'tear' },
  love: { eyes: 'happy', mouth: 'smile', extra: 'heart' },
  party: { eyes: 'happy', mouth: 'big', extra: 'confetti' },
  wait: { eyes: 'open', mouth: 'calm', extra: 'dots' },
};

/** Fase del ciclo → estado de ánimo de Luni. */
export const PHASE_MOOD = {
  menstrual: 'sleepy', follicular: 'happy', fertile: 'sparkle', ovulation: 'sparkle', luteal: 'calm', late: 'worried',
};

function Extra({ type }) {
  switch (type) {
    case 'zz':
      return <text x="84" y="34" className="luni__extra luni__zz">z<tspan dx="1" dy="-7" fontSize="0.8em">z</tspan></text>;
    case 'stars':
      return (
        <g className="luni__extra luni__accent">
          <path d="M96 22 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
          <path d="M104 52 l1.3 3.7 3.7 1.3 -3.7 1.3 -1.3 3.7 -1.3 -3.7 -3.7 -1.3 3.7 -1.3z" />
          <circle cx="86" cy="12" r="2" />
        </g>
      );
    case 'cloud':
      return <path className="luni__extra luni__soft" d="M84 30 a7 7 0 0 1 13 -3 a6 6 0 0 1 9 6 a5 5 0 0 1 -2 9 h-19 a6 6 0 0 1 -1 -12z" />;
    case 'tear':
      return <path className="luni__extra luni__tear" d="M62 69 q3 5 0 8 q-3 -3 0 -8z" />;
    case 'heart':
      return <path className="luni__extra luni__accent" d="M96 26 c-4 -6 -12 -2 -9 4 l9 9 9 -9 c3 -6 -5 -10 -9 -4z" />;
    case 'confetti':
      return (
        <g className="luni__extra">
          <rect x="88" y="14" width="5" height="5" rx="1" className="luni__accent" transform="rotate(20 90 16)" />
          <rect x="102" y="34" width="5" height="5" rx="1" className="luni__soft" transform="rotate(-15 104 36)" />
          <circle cx="96" cy="50" r="2.5" className="luni__accent" />
          <circle cx="16" cy="20" r="2.5" className="luni__soft" />
          <rect x="10" y="40" width="4" height="4" rx="1" className="luni__accent" transform="rotate(30 12 42)" />
        </g>
      );
    case 'dots':
      return (
        <g className="luni__extra luni__soft">
          <circle cx="88" cy="30" r="3" /><circle cx="97" cy="30" r="3" /><circle cx="106" cy="30" r="3" />
        </g>
      );
    default:
      return null;
  }
}

export default function Mascot({ mood = 'happy', size = 96, interactive = false, className = '' }) {
  const m = MOODS[mood] ?? MOODS.happy;
  const [bounce, setBounce] = useState(0);
  const svg = (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false"
      className={`luni luni--${mood} ${className}`} key={bounce}>
      {/* cuerpo: luna creciente */}
      <path className="luni__body" d="M62.4 16.2 A46 46 0 1 0 103.7 67.1 A34 34 0 0 1 62.4 16.2 Z" />
      {/* cachetes */}
      <ellipse cx="30" cy="70" rx="6" ry="4" className="luni__blush" />
      <ellipse cx="63" cy="73" rx="6" ry="4" className="luni__blush" />
      {EYES[m.eyes]}
      {MOUTHS[m.mouth]}
      <Extra type={m.extra} />
    </svg>
  );
  if (!interactive) return svg;
  // Interactiva: al tocarla da un saltito (sin animaciones automáticas largas: guía `motion`, WCAG 2.2.2)
  return (
    <button type="button" className="luni-btn" onClick={() => setBounce((n) => n + 1)} aria-label="Luni, la mascota de My Days">
      {svg}
    </button>
  );
}
