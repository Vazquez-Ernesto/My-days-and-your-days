import { describe, it, expect } from 'vitest';
import { QUESTIONS, questionsFor, compare, syncLabel, quizStatus, QUESTIONS_PER_DAY } from './quiz.js';
import { addDays } from './dates.js';

describe('cuestionario en pareja', () => {
  it('cada pregunta tiene 4 opciones distintas y texto', () => {
    for (const q of QUESTIONS) {
      expect(q.q.length).toBeGreaterThan(10);
      expect(new Set(q.o).size).toBe(4);
    }
    expect(new Set(QUESTIONS.map((q) => q.q)).size).toBe(QUESTIONS.length);
  });

  it('a los dos les tocan las mismas 5 preguntas (mismo vínculo y fecha)', () => {
    expect(questionsFor('pair-123', '2026-11-16')).toEqual(questionsFor('pair-123', '2026-11-16'));
    expect(questionsFor('pair-123', '2026-11-16')).toHaveLength(QUESTIONS_PER_DAY);
  });

  it('otra pareja tiene otro orden', () => {
    const a = questionsFor('pair-A', '2026-11-16').map((q) => q.id);
    const b = questionsFor('pair-B', '2026-11-16').map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it('no se repiten preguntas hasta usar todo el banco (banco original)', () => {
    const days = Math.floor(64 / QUESTIONS_PER_DAY);
    const ids = [];
    for (let d = 0; d < days; d++) ids.push(...questionsFor('pair-123', addDays('2026-01-01', d)).map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    [[0, 1, 2, 3, 0], [0, 1, 2, 3, 0], 5, '¡Almas gemelas!'],
    [[0, 1, 2, 3, 0], [0, 1, 2, 0, 1], 3, 'Re en sintonía'],
    [[0, 1, 2, 3, 0], [0, 1, 0, 0, 1], 2, 'Parecidos, pero cada uno con lo suyo'],
    [[0, 1, 2, 3, 0], [1, 0, 0, 0, 1], 0, 'Polos opuestos que se complementan'],
  ])('compara respuestas %j vs %j → %i coincidencias', (mine, theirs, matches, title) => {
    expect(compare(mine, theirs).matches).toBe(matches);
    expect(syncLabel(matches).title).toBe(title);
  });

  it('estado: por responder, esperando al otro, resultados', () => {
    expect(quizStatus(undefined)).toBe('todo');
    expect(quizStatus({ mine: [0, 0, 0, 0, 0] })).toBe('waiting');
    expect(quizStatus({ mine: [0, 0, 0, 0, 0], theirs: [1, 1, 1, 1, 1] })).toBe('done');
  });
});

import { BANKS, ROUNDS_FROM, ROUND_SEGMENTS, questionIds, sameQuestions, questionsForRound, currentQuizKey, roundKey, roundOf } from './quiz.js';
import snapshot from './quiz.v1-snapshot.json';

const both = (completedOn) => ({ mine: [0, 0, 0, 0, 0], theirs: [1, 1, 1, 1, 1], completedOn });

describe('banco original (por fecha) y rondas', () => {
  it('antes de las rondas, las preguntas del día son EXACTAMENTE las de antes', () => {
    for (const [key, ids] of Object.entries(snapshot)) {
      const [pair, date] = key.split('|');
      if (date < ROUNDS_FROM) expect(questionIds(pair, date), key).toEqual(ids);
    }
  });

  it('los tramos de las rondas cubren todo el banco, sin huecos ni repetidas', () => {
    const covered = ROUND_SEGMENTS.flatMap(([a, b]) => Array.from({ length: b - a }, (_, i) => a + i)).sort((x, y) => x - y);
    expect(covered).toEqual(QUESTIONS.map((_, i) => i));
    expect(BANKS[0].size).toBe(64);
  });

  it('las rondas recorren primero las preguntas nuevas y no repiten hasta usar todo el banco', () => {
    const rounds = Math.floor(QUESTIONS.length / QUESTIONS_PER_DAY);
    const ids = [];
    for (let n = 0; n < rounds; n++) ids.push(...questionsForRound('pair-123', n).map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 95).every((id) => id >= 64)).toBe(true); // las 95 nuevas primero
    expect(questionsForRound('pair-123', 3)).toEqual(questionsForRound('pair-123', 3)); // las dos personas, iguales
    expect(questionsForRound('pair-A', 0)).not.toEqual(questionsForRound('pair-B', 0));
  });

  it('si no responden, las preguntas NO se pierden: la ronda sigue abierta los días que haga falta', () => {
    expect(currentQuizKey({}, '2026-11-24')).toBe('2026-11-24'); // todavía banco por fecha
    expect(currentQuizKey({}, '2026-11-25')).toBe('r0');
    expect(currentQuizKey({}, '2026-12-10')).toBe('r0'); // pasaron días sin responder: sigue la ronda 1
    expect(currentQuizKey({ r0: { mine: [0, 0, 0, 0, 0] } }, '2026-12-10')).toBe('r0'); // solo uno respondió
  });

  it('la ronda avanza al día siguiente de que respondan los dos (ese día ven los resultados)', () => {
    expect(currentQuizKey({ r0: both('2026-11-26') }, '2026-11-26')).toBe('r0');
    expect(currentQuizKey({ r0: both('2026-11-26') }, '2026-11-27')).toBe('r1');
    expect(currentQuizKey({ r0: both('2026-11-26'), r1: both('2026-11-30') }, '2026-12-05')).toBe('r2');
  });

  it('claves de ronda', () => {
    expect(roundKey(4)).toBe('r4');
    expect(roundOf('r4')).toBe(4);
    expect(roundOf('2026-11-25')).toBeNull();
  });

  it('detecta si el otro respondió otras preguntas (app de otra versión)', () => {
    expect(sameQuestions(questionIds('p', 'r2'), 'p', 'r2')).toBe(true);
    expect(sameQuestions(questionIds('p', 'r1'), 'p', 'r2')).toBe(false);
    expect(sameQuestions(undefined, 'p', '2026-11-20')).toBe(true);  // app vieja, banco original: mismas preguntas
    expect(sameQuestions(undefined, 'p', 'r0')).toBe(false);         // app vieja no conoce las rondas
  });

  it('las preguntas están en castellano rioplatense (voseo, sin "tú")', () => {
    const tuteo = /\b(tú|tienes|quieres|puedes|eres|sabes|piensas|prefieres|haces|te gustaría que tú)\b/i;
    for (const q of QUESTIONS) {
      expect(`${q.q} ${q.o.join(' ')}`, q.q).not.toMatch(tuteo);
      expect(q.cat.length).toBeGreaterThan(2);
    }
  });
});

import { parseQuizMessage } from './quiz.js';

describe('mensajes del cuestionario que llegan de la pareja', () => {
  const ok = { type: 'quiz', date: '2026-11-26', answers: [0, 1, 2, 3, 0], name: 'Leo', questions: [1, 2, 3, 4, 5] };

  it('acepta un mensaje bien formado (por fecha o por ronda)', () => {
    expect(parseQuizMessage(ok)).toEqual({ key: '2026-11-26', answers: [0, 1, 2, 3, 0], name: 'Leo', questions: [1, 2, 3, 4, 5] });
    expect(parseQuizMessage({ ...ok, date: undefined, round: 3 }).key).toBe('r3');
    expect(parseQuizMessage({ ...ok, date: undefined, round: -1 })).toBeNull();
    expect(parseQuizMessage({ ...ok, date: undefined, round: 1.5 })).toBeNull();
  });

  it.each([
    ['fecha rara', { ...ok, date: '26/11/2026' }],
    ['fecha con basura', { ...ok, date: '2026-11-26"><script>' }],
    ['respuestas de menos', { ...ok, answers: [0, 1] }],
    ['respuesta fuera de rango', { ...ok, answers: [0, 1, 2, 3, 9] }],
    ['respuesta que no es número', { ...ok, answers: [0, 1, 2, 3, '0'] }],
    ['sin respuestas', { ...ok, answers: undefined }],
  ])('descarta: %s', (_, msg) => {
    expect(parseQuizMessage(msg)).toBeNull();
  });

  it('limpia el nombre e ignora ids inválidos', () => {
    const r = parseQuizMessage({ ...ok, name: `Leo\u0000${'x'.repeat(100)}`, questions: [1, 2, 3, 4, 99999] });
    expect(r.name).toHaveLength(40);
    expect(r.name.startsWith('Leo')).toBe(true);
    expect(r.questions).toBeUndefined();
    expect(parseQuizMessage({ ...ok, name: 42 }).name).toBe('');
  });
});
