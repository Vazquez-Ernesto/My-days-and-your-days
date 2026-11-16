import { test, expect } from '@playwright/test';
import { App, freezeDate } from './helpers.js';

test('una usuaria nueva completa el onboarding y ve su predicción', async ({ page }) => {
  await freezeDate(page);
  const app = new App(page);
  await app.goto();

  await expect(page.getByRole('heading', { name: 'Te damos la bienvenida a My Days' })).toBeVisible();
  await page.getByRole('button', { name: /Llevo mi ciclo/ }).click();
  await page.locator('input[type=date]').fill('2026-11-10');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Más' }).nth(1).click(); // ciclo 28 → 29
  await page.getByRole('button', { name: 'Listo' }).click();

  // 10/11 + 29 días = 9/12 → faltan 19 días desde el 20/11
  await app.expectRing('19', 'días para tu período');
  await expect(page.getByText('Día 11 del ciclo')).toBeVisible();

  const state = await app.savedState();
  expect(state.settings.cycleLength).toBe(29);
  expect(state.periodDays).toHaveLength(5);
  expect(state.role).toBe('self');
});

test('quien ya usaba la app (sin rol guardado) sigue como "llevo mi ciclo"', async ({ page }) => {
  await freezeDate(page);
  await page.addInitScript(() => localStorage.setItem('mydays:v1', JSON.stringify({
    onboarded: true, periodDays: ['2026-11-03', '2026-11-04'], logs: {}, plan: 'free', settings: { cycleLength: 28, periodLength: 5 },
  })));
  const app = new App(page);
  await app.goto();
  await expect(app.ringBig).toBeVisible();
  await expect(app.tab('Yo')).toBeVisible();
  expect((await app.savedState()).role).toBe('self');
});
