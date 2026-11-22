import { describe, it, expect } from 'vitest';
import { dayMarkers, cellMarkers, MARKER_LEGEND } from './dayMarkers.js';

describe('íconos del calendario', () => {
  it('cada cosa del registro tiene su propio emoji, en orden de prioridad', () => {
    const m = dayMarkers({
      flow: 'heavy', sex: 'protected', orgasm: true, mood: 'happy', symptoms: ['Cólicos', 'Acné'],
      pill: true, partnerNote: 'Te quiero', note: 'privado', temp: 36.6, weight: 60,
    });
    expect(m.map((x) => x.emoji)).toEqual(['🩸', '❤️', '😊', '🤕', '💊', '💌', '📝', '🌡️', '⚖️']);
    expect(m.map((x) => x.label)).toEqual([
      'Flujo abundante', 'Relaciones con protección, con orgasmo', 'Ánimo: feliz', 'Síntomas: Cólicos, Acné',
      'Píldora tomada', 'Nota para tu pareja', 'Nota privada', 'Temperatura 36.6 °C', 'Peso 60 kg',
    ]);
  });

  it('el manchado se distingue del flujo', () => {
    expect(dayMarkers({ flow: 'spotting' })).toEqual([{ key: 'spotting', emoji: '💧', label: 'Manchado' }]);
    expect(dayMarkers({ flow: 'light' })[0]).toMatchObject({ emoji: '🩸', label: 'Flujo leve' });
  });

  it('para él, la nota se lee como "te dejó una nota"', () => {
    expect(dayMarkers({ partnerNote: 'Hola' }, 'partner')[0].label).toBe('Te dejó una nota');
  });

  it('el ánimo muestra su propio emoji', () => {
    expect(dayMarkers({ mood: 'sad' })[0]).toMatchObject({ emoji: '😢', label: 'Ánimo: triste' });
  });

  it('sin registro o con campos vacíos, no hay íconos', () => {
    expect(dayMarkers(undefined)).toEqual([]);
    expect(dayMarkers({ flow: null, symptoms: [], note: '  ', partnerNote: '' })).toEqual([]);
  });

  it('en la celda entran 3 íconos y el resto se resume con +N', () => {
    const m = dayMarkers({ flow: 'medium', sex: 'unprotected', mood: 'calm', pill: true, temp: 36.5 });
    expect(cellMarkers(m)).toMatchObject({ more: 3 }); // 2 emojis + "+3" ocupan los 3 lugares
    expect(cellMarkers(m).shown.map((x) => x.emoji)).toEqual(['🩸', '❤️']);
    expect(cellMarkers(m.slice(0, 3)).more).toBe(0); // justo 3: entran todos
    expect(cellMarkers(m.slice(0, 2)).more).toBe(0);
  });

  it('la leyenda tiene un emoji distinto para cada cosa', () => {
    expect(new Set(MARKER_LEGEND.map((l) => l.emoji)).size).toBe(MARKER_LEGEND.length);
  });
});
