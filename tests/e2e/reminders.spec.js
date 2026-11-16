import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
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

test('activar notificaciones push: suscribe el teléfono y programa los avisos CIFRADOS', async ({ page }) => {
  // Suscripción simulada con claves P-256 válidas (el Chromium de los tests no llega a los servidores de push)
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const fakeSub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-test',
    keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') },
  };
  await page.addInitScript((sub) => {
    PushManager.prototype.getSubscription = async () => null;
    PushManager.prototype.subscribe = async () => ({ toJSON: () => sub, unsubscribe: async () => true });
  }, fakeSub);
  await mockNotifications(page);
  await freezeDate(page);
  await seed(page, { settings: { reminders: { pill: { on: true, time: '21:00' } } } });

  const sent = [];
  page.on('request', (r) => r.url().includes('/api/push/') && sent.push({ url: r.url(), method: r.method(), body: r.postData() }));

  const app = new App(page);
  await app.goto();
  await app.openTab('Recordatorios');
  await page.getByRole('switch', { name: 'Activar notificaciones push' }).check();
  await expect(page.getByText('Activadas ✓ Llegan aunque la app esté cerrada.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar notificación de prueba' })).toBeVisible();

  // Se registró la suscripción y se subió el calendario de avisos
  await expect.poll(() => sent.some((r) => r.method === 'PUT' && r.url.endsWith('/api/push/schedule')), { timeout: 10_000 }).toBe(true);
  expect(sent.find((r) => r.url.endsWith('/api/push/subscription')).body).toContain('e2e-test');
  const schedule = JSON.parse(sent.find((r) => r.url.endsWith('/api/push/schedule')).body);
  expect(schedule.items.length).toBeGreaterThanOrEqual(7); // al menos la píldora de cada día
  const raw = JSON.stringify(schedule);
  for (const secret of ['píldora', 'período', 'Tu período', 'pill']) expect(raw).not.toContain(secret);
  expect((await app.savedState()).cloud).toMatchObject({ pushEnabled: true });
});

test('avisa si la usuaria bloqueó las notificaciones', async ({ page }) => {
  await mockNotifications(page, 'denied');
  await freezeDate(page);
  await seed(page);
  const app = new App(page);
  await app.goto();
  await app.openTab('Recordatorios');
  // click() y no check(): el switch se enciende y vuelve a apagarse enseguida porque el permiso fue rechazado
  await page.getByRole('switch', { name: 'Activar notificaciones push' }).click();
  await expect(page.getByRole('alert')).toContainText('Las notificaciones están bloqueadas');
  await expect(page.getByRole('switch', { name: 'Activar notificaciones push' })).not.toBeChecked();
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
