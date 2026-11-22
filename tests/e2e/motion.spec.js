import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

// Guía `motion` (modern-web-guidance): las animaciones de movimiento son opt-in y el estado final queda visible.
test.describe('movimiento reducido', () => {
  test.beforeEach(async ({ page }) => { await freezeDate(page); await seed(page); });

  test('con "Reducir movimiento" no corre ninguna animación de movimiento y todo queda visible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const app = new App(page);
    await app.goto();
    await expect(page.locator('.luni-say .luni')).toBeVisible();
    const running = await page.evaluate(() => document.getAnimations()
      .filter((a) => a.playState === 'running').map((a) => a.animationName ?? 'waapi'));
    expect(running).toEqual([]);
    await expect(app.ringBig).toBeVisible();
    await expect(app.ringBig).toHaveCSS('opacity', '1');
    // las transiciones de color siguen funcionando (la guía pide no apagarlas)
    const transition = await page.locator('.btn--primary').first().evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).not.toBe('none');
  });

  test('sin esa preferencia, Luni entra con su animación (una sola vez, no en bucle)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const app = new App(page);
    await app.goto();
    const info = await page.locator('.luni-say .luni').evaluate((el) => el.getAnimations().map((a) => ({
      name: a.animationName, iterations: a.effect.getTiming().iterations,
    })));
    expect(info).toContainEqual({ name: 'luniIn', iterations: 1 });
  });
});
