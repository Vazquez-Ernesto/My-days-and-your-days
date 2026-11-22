// Deslizar el dedo (o arrastrar con el mouse) a izquierda/derecha.
import { useRef } from 'react';

export const SWIPE_MIN = 50; // píxeles mínimos para considerar que fue un deslizamiento

/** Devuelve 'left' | 'right' | null según el movimiento (dx, dy). Función pura: fácil de testear. */
export function swipeDirection(dx, dy) {
  if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return null; // corto o mayormente vertical (scroll)
  return dx < 0 ? 'left' : 'right';
}

/**
 * Handlers para un contenedor. Si hubo deslizamiento, se cancela el "click" que sigue,
 * así no se selecciona un día sin querer al soltar el dedo.
 */
export function useSwipe({ onLeft, onRight }) {
  const start = useRef(null);
  const swiped = useRef(false);
  return {
    onPointerDown: (e) => { start.current = { x: e.clientX, y: e.clientY }; swiped.current = false; },
    onPointerUp: (e) => {
      if (!start.current) return;
      const dir = swipeDirection(e.clientX - start.current.x, e.clientY - start.current.y);
      start.current = null;
      if (!dir) return;
      swiped.current = true;
      (dir === 'left' ? onLeft : onRight)?.();
    },
    onPointerCancel: () => { start.current = null; },
    onClickCapture: (e) => {
      if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false; }
    },
  };
}
