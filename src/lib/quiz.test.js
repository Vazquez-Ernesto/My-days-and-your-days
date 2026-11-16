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

  it('no se repiten preguntas hasta usar todo el banco', () => {
    const days = Math.floor(QUESTIONS.length / QUESTIONS_PER_DAY);
    const ids = [];
    for (let d = 0; d < days; d++) ids.push(...questionsFor('pair-123', addDays('2026-11-16', d)).map((q) => q.id));
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
