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

import { BANKS, bankFor, questionIds, sameQuestions } from './quiz.js';
import snapshot from './quiz.v1-snapshot.json';

describe('banco de preguntas por versiones', () => {
  it('hasta el cambio de banco, las preguntas del día son EXACTAMENTE las de antes', () => {
    for (const [key, ids] of Object.entries(snapshot)) {
      const [pair, date] = key.split('|');
      if (date < BANKS[1].from) expect(questionIds(pair, date), key).toEqual(ids);
    }
  });

  it('cada versión del banco abarca preguntas que existen', () => {
    expect(BANKS.at(-1).size).toBe(QUESTIONS.length);
    for (let i = 1; i < BANKS.length; i++) {
      expect(BANKS[i].size).toBeGreaterThan(BANKS[i - 1].size);
      expect(BANKS[i].from > BANKS[i - 1].from).toBe(true);
    }
  });

  it('desde el banco nuevo aparecen preguntas nuevas y no se repiten hasta usarlas todas', () => {
    expect(bankFor('2026-11-24')).toBe(BANKS[0]);
    expect(bankFor('2026-11-25')).toBe(BANKS[1]);
    const days = Math.floor(QUESTIONS.length / QUESTIONS_PER_DAY);
    const ids = [];
    for (let d = 0; d < days; d++) ids.push(...questionIds('pair-123', addDays('2026-11-25', d)));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id >= BANKS[0].size)).toBe(true);
  });

  it('detecta si el otro respondió otras preguntas (app de otra versión)', () => {
    const date = '2026-11-26';
    expect(sameQuestions(questionIds('p', date), 'p', date)).toBe(true);
    expect(sameQuestions([0, 1, 2, 3, 4], 'p', date)).toBe(questionIds('p', date).join() === '0,1,2,3,4');
    expect(sameQuestions(undefined, 'p', '2026-11-20')).toBe(true);  // app vieja, banco viejo: mismas preguntas
    expect(sameQuestions(undefined, 'p', '2026-11-26')).toBe(false); // app vieja, banco nuevo: no comparamos
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

  it('acepta un mensaje bien formado', () => {
    expect(parseQuizMessage(ok)).toEqual({ date: '2026-11-26', answers: [0, 1, 2, 3, 0], name: 'Leo', questions: [1, 2, 3, 4, 5] });
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
