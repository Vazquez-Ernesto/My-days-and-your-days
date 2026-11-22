import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

test.beforeEach(async ({ page }) => { await freezeDate(page); await seed(page); });

test('muestra los días que faltan y la fase actual', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  // último período 3/11, ciclo 28 → próximo 1/12 → faltan 11 días
  await app.expectRing('11', 'días para tu período');
  await expect(page.getByText('Fase lútea')).toBeVisible();
});

test('"Me vino hoy" y "Terminó hoy" actualizan el ciclo', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  await page.getByRole('button', { name: 'Me vino hoy' }).click();
  await app.expectRing('Día 1', 'de tu período');
  await expect(page.getByText('Menstruación')).toBeVisible();

  await page.getByRole('button', { name: 'Terminó hoy' }).click();
  const state = await app.savedState();
  expect(state.periodDays).toContain('2026-11-20');
  expect(state.periodDays).not.toContain('2026-11-21');
});

test('el calendario marca período, fertilidad y ovulación', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  await app.openTab('Calendario');
  await expect(page.locator('[data-date="2026-11-03"]')).toHaveClass(/is-period/);
  await expect(page.locator('[data-date="2026-11-17"]')).toHaveClass(/is-ovulation/);
  await expect(page.locator('[data-date="2026-11-13"]')).toHaveClass(/is-fertile/);
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.locator('[data-date="2026-12-01"]')).toHaveClass(/is-predicted/);
});
