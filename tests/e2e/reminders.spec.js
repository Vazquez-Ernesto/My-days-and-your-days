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
  await app.openTab('Recordatorios');
  await page.getByRole('switch', { name: 'Activar recordatorios' }).check();
  await expect(page.getByText('Notificaciones permitidas en este dispositivo.')).toBeVisible();
  expect((await app.savedState()).settings.reminders.enabled).toBe(true);
});

test('avisa si la usuaria bloqueó las notificaciones', async ({ page }) => {
  await mockNotifications(page, 'denied');
  await freezeDate(page);
  await seed(page);
  const app = new App(page);
  await app.goto();
  await app.openTab('Recordatorios');
  await page.getByRole('switch', { name: 'Activar recordatorios' }).check();
  await expect(page.getByText(/Bloqueaste las notificaciones/)).toBeVisible();
});

test('no notifica antes de la hora configurada', async ({ page }) => {
  await mockNotifications(page);
  await freezeDate(page, '2026-11-29', '08:00'); // el aviso es a las 09:00
  await seed(page, { settings: { reminders: { enabled: true } } });
  await new App(page).goto();
  await expect(page.getByRole('status')).toContainText('Tu período llega en 2 días'); // en la app sí se ve
  expect(await sentNotifications(page)).toEqual([]);
});

test('píldora: el aviso desaparece al marcarla como tomada', async ({ page }) => {
  await freezeDate(page);
  await seed(page);
  const app = new App(page);
  await app.goto();
  await app.openTab('Recordatorios');
  await page.getByRole('switch', { name: 'Tomar la píldora' }).check();
  await page.getByLabel('Hora').last().fill('08:30');
  await app.openTab('Hoy');
  const pill = page.getByRole('status').filter({ hasText: 'Hora de tu píldora' });
  await expect(pill).toBeVisible();
  await pill.getByRole('button', { name: 'Tomada' }).click();
  await expect(pill).toHaveCount(0);
  const state = await app.savedState();
  expect(state.logs['2026-11-20'].pill).toBe(true);
  expect(state.settings.reminders.pill).toMatchObject({ on: true, time: '08:30' });
});

test('cita médica: avisa el día anterior', async ({ page }) => {
  await freezeDate(page);
  await seed(page);
  const app = new App(page);
  await app.goto();
  await app.openTab('Recordatorios');
  await page.getByRole('switch', { name: 'Cita con el médico' }).check();
  await page.locator('#rem-appointment-date').fill('2026-11-21');
  await page.locator('#rem-appointment-time').fill('15:30');
  await page.getByPlaceholder(/Ginecóloga/).fill('Ginecóloga');
  await app.openTab('Hoy');
  await expect(page.getByRole('status').filter({ hasText: 'Mañana tenés cita médica a las 15:30' })).toBeVisible();
});
