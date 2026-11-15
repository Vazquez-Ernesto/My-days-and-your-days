import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

test('registrar síntomas, ánimo y nota de un día', async ({ page }) => {
  await freezeDate(page);
  await seed(page);
  const app = new App(page);
  await app.goto();

  await page.getByRole('button', { name: 'Registrar día' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: /Irritable/ }).click();
  await sheet.getByRole('button', { name: 'Cólicos' }).click();
  await sheet.getByRole('button', { name: 'Hinchazón' }).click();
  await sheet.getByPlaceholder('¿Algo más que quieras recordar?').fill('Día pesado');
  await sheet.getByRole('button', { name: 'Guardar' }).click();
  await expect(sheet).toBeHidden();

  await app.openTab('Calendario');
  await expect(page.getByText('Cólicos')).toBeVisible();
  await expect(page.getByText('“Día pesado”')).toBeVisible();

  // persiste al recargar
  await page.reload();
  const state = await app.savedState();
  expect(state.logs['2026-11-20']).toMatchObject({ mood: 'irritable', symptoms: ['Cólicos', 'Hinchazón'] });
});
