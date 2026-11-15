import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

test.beforeEach(async ({ page }) => { await freezeDate(page); await seed(page); });

test('cada día muestra su número de día del ciclo', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  await app.openTab('Calendario');
  await expect(page.getByRole('button', { name: '2026-11-03' }).locator('.cal__cd')).toHaveText('1');
  await expect(page.getByRole('button', { name: '2026-11-20' }).locator('.cal__cd')).toHaveText('18');
  await page.getByRole('button', { name: '2026-11-17' }).click();
  await expect(page.getByText('Día del ciclo: 15')).toBeVisible();
  await expect(page.getByText('Ovulación prevista')).toBeVisible();
});

test('editar período: marcar y desmarcar días tocándolos', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  await app.openTab('Calendario');
  await page.getByRole('button', { name: 'Editar período' }).click();
  await page.getByRole('button', { name: '2026-11-08' }).click(); // agregar un día
  await page.getByRole('button', { name: '2026-11-03' }).click(); // quitar un día
  await expect(page.getByRole('button', { name: '2026-11-21' })).toBeDisabled(); // no se puede marcar el futuro
  await page.getByRole('button', { name: 'Listo' }).click();

  const { periodDays } = await app.savedState();
  expect(periodDays).toContain('2026-11-08');
  expect(periodDays).not.toContain('2026-11-03');
});

test('registrar relaciones, peso y temperatura y verlos en Yo', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  const sheet = await app.openLog();
  await sheet.getByRole('button', { name: '♥ Sin protección' }).click();
  await sheet.getByRole('button', { name: '✨ Orgasmo' }).click();
  await sheet.getByLabel('Peso').fill('61.5');
  await sheet.getByLabel('Temperatura').fill('36.62');
  await sheet.getByRole('button', { name: 'Guardar' }).click();

  await app.openTab('Yo');
  await expect(page.getByText('61.5 kg', { exact: true })).toBeVisible();
  await expect(page.getByText('36.62 °C', { exact: true })).toBeVisible();
  await expect(page.getByText('Esta semana 1 vez')).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();
});

test('Ajustes se abre desde el engranaje y se puede volver', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  await app.openSettings();
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(app.ringBig).toBeVisible();
});

test('borrar todo pide confirmación dentro de la app', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  await app.openSettings();
  await page.getByRole('button', { name: 'Borrar todo' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  expect((await app.savedState()).onboarded).toBe(true);
  await page.getByRole('button', { name: 'Borrar todo' }).click();
  await page.getByRole('button', { name: 'Sí, borrar todo' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenida a My Days' })).toBeVisible();
});
