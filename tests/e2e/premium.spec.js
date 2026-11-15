import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

test.beforeEach(async ({ page }) => { await freezeDate(page); });

test('plan gratis: anuncio visible y gráficos bloqueados', async ({ page }) => {
  await seed(page);
  const app = new App(page);
  await app.goto();
  await expect(page.getByText('Anuncio', { exact: true })).toBeVisible();
  await app.openTab('Análisis');
  await expect(page.getByText('Disponible en Premium')).toBeVisible();
  await expect(page.getByText('Largo de tus ciclos')).toHaveCount(0);
});

test('mejorar a Premium desbloquea gráficos y quita anuncios', async ({ page }) => {
  await seed(page);
  const app = new App(page);
  await app.goto();
  await page.getByText('Probá Premium').click();
  await expect(page.getByText('$19.99 / año').first()).toBeVisible();
  await page.getByRole('button', { name: 'Probar 7 días gratis' }).click();

  await expect(page.getByText('Anuncio', { exact: true })).toHaveCount(0);
  await app.openTab('Análisis');
  await expect(page.getByText('Largo de tus ciclos')).toBeVisible();
  expect((await app.savedState()).plan).toBe('premium');
});

test('PIN: bloquea la app y rechaza un PIN incorrecto', async ({ page }) => {
  await seed(page, { plan: 'premium', settings: { pin: '1234' } });
  const app = new App(page);
  await app.goto();
  await expect(page.getByText('Ingresá tu PIN')).toBeVisible();

  for (const d of '9999') await page.getByRole('button', { name: d, exact: true }).click();
  await expect(page.getByText('Ingresá tu PIN')).toBeVisible();

  for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
  await expect(app.ringBig).toBeVisible();
});
