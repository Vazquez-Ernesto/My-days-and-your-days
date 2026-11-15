import { test, expect } from '@playwright/test';
import { App, freezeDate, seed, mockNotifications, sentNotifications } from './helpers.js';

test('muestra el aviso dentro de la app 2 días antes del período', async ({ page }) => {
  await freezeDate(page, '2026-11-29'); // próximo período: 1/12
  await seed(page);
  await new App(page).goto();
  await expect(page.getByRole('status')).toContainText('Tu período llega en 2 días');
});

test('envía notificación del sistema una sola vez por día', async ({ page }) => {
  await mockNotifications(page);
  await freezeDate(page, '2026-11-29');
  await seed(page, { settings: { reminders: { enabled: true, daysBefore: 2, fertile: true } } });
  const app = new App(page);
  await app.goto();

  await expect.poll(() => sentNotifications(page)).toEqual([
    { title: 'Tu período llega en 2 días', body: 'Un buen momento para prepararte.' },
  ]);
  expect((await app.savedState()).notified).toEqual(['period-soon:2026-11-29']);

  await page.reload();
  await expect(app.ringBig).toBeVisible();
  expect(await sentNotifications(page)).toHaveLength(1); // no se repite
});

test('no envía notificaciones si la usuaria no las activó', async ({ page }) => {
  await mockNotifications(page);
  await freezeDate(page, '2026-11-29');
  await seed(page);
  await new App(page).goto();
  await expect(page.getByRole('status')).toBeVisible();
  expect(await sentNotifications(page)).toEqual([]);
});

test('activar recordatorios desde Ajustes', async ({ page }) => {
  await mockNotifications(page);
  await freezeDate(page);
  await seed(page);
  const app = new App(page);
  await app.goto();
  await app.openTab('Ajustes');
  await page.getByRole('checkbox', { name: 'Activar recordatorios' }).check();
  await expect(page.getByText('Notificaciones permitidas.')).toBeVisible();
  expect((await app.savedState()).settings.reminders.enabled).toBe(true);
});

test('avisa si la usuaria bloqueó las notificaciones', async ({ page }) => {
  await mockNotifications(page, 'denied');
  await freezeDate(page);
  await seed(page);
  const app = new App(page);
  await app.goto();
  await app.openTab('Ajustes');
  await page.getByRole('checkbox', { name: 'Activar recordatorios' }).check();
  await expect(page.getByText(/Bloqueaste las notificaciones/)).toBeVisible();
});
