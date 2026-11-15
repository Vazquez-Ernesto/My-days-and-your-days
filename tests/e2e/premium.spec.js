import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

test.beforeEach(async ({ page }) => { await freezeDate(page); });

test('plan gratis: anuncio visible y funciones Premium bloqueadas', async ({ page }) => {
  await seed(page);
  const app = new App(page);
  await app.goto();
  await expect(page.getByText('Anuncio', { exact: true })).toBeVisible();
  await app.openTab('Yo');
  await expect(page.getByText('Patrones de síntomas por ciclo')).toBeVisible();
  await expect(page.getByText('Disponible en Premium')).toHaveCount(2);
  await expect(page.getByText('Largo de tus ciclos', { exact: true })).toHaveCount(0);
});

test('la vista anual del calendario pide Premium', async ({ page }) => {
  await seed(page);
  const app = new App(page);
  await app.goto();
  await app.openTab('Calendario');
  await page.getByRole('tab', { name: 'Año' }).click();
  await expect(page.getByRole('heading', { name: 'My Days Premium' })).toBeVisible();
});

test('mejorar a Premium desbloquea gráficos, vista anual y quita anuncios', async ({ page }) => {
  await seed(page);
  const app = new App(page);
  await app.goto();
  await page.getByText('Probá Premium').click();
  await expect(page.getByText('$19.99 / año').first()).toBeVisible();
  await page.getByRole('button', { name: 'Probar 7 días gratis' }).click();

  await expect(page.getByText('Anuncio', { exact: true })).toHaveCount(0);
  await app.openTab('Yo');
  await expect(page.getByText('Largo de tus ciclos')).toBeVisible();
  await expect(page.getByText('Patrón por ciclo')).toBeVisible();
  await app.openTab('Calendario');
  await page.getByRole('tab', { name: 'Año' }).click();
  await expect(page.getByRole('button', { name: 'Noviembre 2026' })).toBeVisible();
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
