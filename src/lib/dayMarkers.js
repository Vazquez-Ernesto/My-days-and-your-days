// Íconos de cada día del calendario: cada cosa del registro tiene su propio emoji.
// Función pura (fácil de testear). El emoji es decorativo; `label` es lo que se lee en voz alta.

const FLOW_LABEL = { spotting: 'Manchado', light: 'Flujo leve', medium: 'Flujo medio', heavy: 'Flujo abundante' };
const MOOD = {
  happy: ['😊', 'feliz'], calm: ['😌', 'tranquila'], sensitive: ['🥺', 'sensible'],
  sad: ['😢', 'triste'], irritable: ['😤', 'irritable'], anxious: ['😰', 'ansiosa'],
};

/** Referencias para la leyenda (en el mismo orden de prioridad que en el calendario). */
export const MARKER_LEGEND = [
  { key: 'spotting', emoji: '💧', text: 'Manchado' },
  { key: 'flow', emoji: '🩸', text: 'Flujo (leve, medio o abundante)' },
  { key: 'sex', emoji: '❤️', text: 'Relaciones sexuales' },
  { key: 'mood', emoji: '😊', text: 'Ánimo (muestra el emoji de cómo te sentiste)' },
  { key: 'symptoms', emoji: '🤕', text: 'Síntomas' },
  { key: 'pill', emoji: '💊', text: 'Píldora tomada', private: true },
  { key: 'partnerNote', emoji: '💌', text: 'Nota para tu pareja' },
  { key: 'note', emoji: '📝', text: 'Nota privada', private: true },
  { key: 'temp', emoji: '🌡️', text: 'Temperatura' },
  { key: 'weight', emoji: '⚖️', text: 'Peso' },
];

/**
 * Íconos de un día, en orden de prioridad.
 * @param log     registro del día (o lo que ella compartió)
 * @param viewer  'self' (ella) | 'partner' (él: "te dejó una nota" en vez de "nota para tu pareja")
 */
export function dayMarkers(log, viewer = 'self') {
  if (!log) return [];
  const out = [];
  if (log.flow) out.push({ key: log.flow === 'spotting' ? 'spotting' : 'flow', emoji: log.flow === 'spotting' ? '💧' : '🩸', label: FLOW_LABEL[log.flow] });
  if (log.sex) {
    const how = log.sex === 'protected' ? 'con protección' : 'sin protección';
    out.push({ key: 'sex', emoji: '❤️', label: `Relaciones ${how}${log.orgasm ? ', con orgasmo' : ''}` });
  }
  if (log.mood && MOOD[log.mood]) out.push({ key: 'mood', emoji: MOOD[log.mood][0], label: `Ánimo: ${MOOD[log.mood][1]}` });
  if (log.symptoms?.length) out.push({ key: 'symptoms', emoji: '🤕', label: `Síntomas: ${log.symptoms.join(', ')}` });
  if (log.pill) out.push({ key: 'pill', emoji: '💊', label: 'Píldora tomada' });
  if (log.partnerNote?.trim()) out.push({ key: 'partnerNote', emoji: '💌', label: viewer === 'partner' ? 'Te dejó una nota' : 'Nota para tu pareja' });
  if (log.note?.trim()) out.push({ key: 'note', emoji: '📝', label: 'Nota privada' });
  if (log.temp) out.push({ key: 'temp', emoji: '🌡️', label: `Temperatura ${log.temp} °C` });
  if (log.weight) out.push({ key: 'weight', emoji: '⚖️', label: `Peso ${log.weight} kg` });
  return out;
}

/** Lo que entra en la celda del calendario: hasta `max` íconos y "+N" con el resto. */
export function cellMarkers(markers, max = 3) {
  // la celda tiene `max` lugares: si no entran todos, el último lo ocupa el "+N"
  const room = markers.length > max ? max - 1 : max;
  return { shown: markers.slice(0, room), more: markers.length - Math.min(room, markers.length) };
}
