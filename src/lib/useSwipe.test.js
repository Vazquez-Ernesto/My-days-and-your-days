import { describe, it, expect } from 'vitest';
import { swipeDirection } from './useSwipe.js';

describe('deslizar para cambiar de mes', () => {
  it.each([
    [-120, 10, 'left'],   // hacia la izquierda → mes siguiente
    [130, -8, 'right'],   // hacia la derecha → mes anterior
    [-30, 0, null],       // muy corto: es un toque
    [-80, 120, null],     // mayormente vertical: es scroll
    [90, 70, null],       // diagonal ambigua: no cambia de mes
  ])('dx=%i, dy=%i → %s', (dx, dy, dir) => {
    expect(swipeDirection(dx, dy)).toBe(dir);
  });
});
