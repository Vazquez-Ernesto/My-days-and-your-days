import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

// Simulamos las respuestas de /api/billing para no depender de Mercado Pago (el resto de la API es real).
const API = 'http://localhost:8080/api/billing';
const PRICES = { enabled: true, trialDays: 7, monthly: { usd: 2.99, ars: 4485 }, yearly: { usd: 19.99, ars: 29985 } };
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockBilling(page, { me = { plan: 'free' }, checkout, cancel } = {}) {
  const calls = { checkout: [], cancel: 0 };
  let current = me;
  await page.route(`${API}/prices`, (r) => r.fulfill(json(PRICES)));
  await page.route(`${API}/me`, (r) => r.fulfill(json(current)));
  await page.route(`${API}/checkout`, (r) => {
    calls.checkout.push(r.request().postDataJSON());
    return r.fulfill(checkout ? checkout() : json({ checkoutUrl: 'http://localhost:4173/?preapproval_id=pre_1#premium' }));
  });
  await page.route(`${API}/cancel`, (r) => {
    calls.cancel++;
    current = cancel;
    return r.fulfill(json(cancel));
  });
  return { calls, setMe: (m) => { current = m; } };
}

test.beforeEach(async ({ page }) => { await freezeDate(page); });

test('suscribirse con Mercado Pago: elige plan, va a pagar y vuelve con Premium', async ({ page }) => {
  await seed(page);
  const billing = await mockBilling(page);
  const app = new App(page);
  await app.goto();
  await page.getByText('Probá Premium').click();

  const dialog = page.getByRole('dialog', { name: 'My Days Premium' });
  await expect(dialog.getByRole('radio', { name: /Anual/ })).toBeChecked();
  await expect(dialog.getByText('Se cobra $ 29.985 por año')).toBeVisible();
  await expect(dialog.getByRole('table', { name: 'Qué incluye cada plan' })).toBeVisible();
  await dialog.getByRole('radio', { name: /Mensual/ }).check();

  // sin email no avanza (validación nativa) y no llama al servidor
  await dialog.getByRole('button', { name: 'Probar 7 días gratis' }).click();
  expect(billing.calls.checkout).toHaveLength(0);

  // Mercado Pago confirma el pago: al volver, el servidor dice premium
  billing.setMe({ plan: 'premium', status: 'authorized', period: 'MONTHLY', nextPaymentAt: '2026-11-27T12:00:00Z', amountArs: 4485 });
  await dialog.getByLabel('Tu email de Mercado Pago').fill('ana@example.com');
  await dialog.getByRole('button', { name: 'Probar 7 días gratis' }).click();

  await expect(page.getByRole('dialog', { name: 'Ya sos Premium 🎉' })).toBeVisible();
  expect(billing.calls.checkout).toEqual([{ period: 'MONTHLY', email: 'ana@example.com' }]);
  await expect(page.getByText('Plan mensual · se renueva el 27 de noviembre')).toBeVisible();
  await expect(page).not.toHaveURL(/premium|preapproval_id/); // limpiamos la URL de vuelta

  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByText('Anuncio', { exact: true })).toHaveCount(0);
  const state = await app.savedState();
  expect(state.plan).toBe('premium');
  expect(state.cloud.token).toBeTruthy(); // registró el teléfono para asociar la suscripción
});

test('cancelar la suscripción: confirma y sigue con Premium hasta fin del período', async ({ page }) => {
  const authorized = { plan: 'premium', status: 'authorized', period: 'YEARLY', nextPaymentAt: '2026-12-22T12:00:00Z', amountArs: 29985 };
  await seed(page, { plan: 'premium', billing: authorized, cloud: { token: 'tok', deviceId: 'dev' } });
  const billing = await mockBilling(page, {
    me: authorized,
    cancel: { ...authorized, status: 'cancelled' },
  });
  const app = new App(page);
  await app.goto();
  await app.openSettings();
  await expect(page.getByText('Plan anual · se renueva el 22 de diciembre')).toBeVisible();
  await page.getByRole('button', { name: 'Administrar' }).click();

  const dialog = page.getByRole('dialog', { name: 'Ya sos Premium 🎉' });
  await expect(dialog.getByText('$ 29.985 por año, con Mercado Pago')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar suscripción' }).click();
  await expect(dialog.getByRole('button', { name: 'Mantener Premium' })).toBeFocused(); // el foco va a la opción segura
  await dialog.getByRole('button', { name: 'Sí, cancelar' }).click();

  await expect(dialog.getByText('Cancelada · tenés Premium hasta el 22 de diciembre')).toBeVisible();
  expect(billing.calls.cancel).toBe(1);
  expect((await app.savedState()).plan).toBe('premium');
});

test('si Mercado Pago falla, muestra el error y deja reintentar', async ({ page }) => {
  await seed(page);
  await mockBilling(page, {
    checkout: () => json({ code: 'PAYMENT_PROVIDER_ERROR', detail: 'caído' }, 502),
  });
  const app = new App(page);
  await app.goto();
  await page.getByText('Probá Premium').click();
  const dialog = page.getByRole('dialog', { name: 'My Days Premium' });
  await dialog.getByLabel('Tu email de Mercado Pago').fill('ana@example.com');
  await dialog.getByRole('button', { name: 'Probar 7 días gratis' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Mercado Pago no respondió bien. Probá de nuevo en un rato.');
  await expect(dialog.getByRole('alert')).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Probar 7 días gratis' })).toBeEnabled();
});

test('con pagos habilitados, el servidor manda: un Premium de demo vuelve a Gratis', async ({ page }) => {
  await seed(page, { plan: 'premium' });
  await mockBilling(page);
  const app = new App(page);
  await app.goto();
  await expect(page.getByText('Anuncio', { exact: true })).toBeVisible();
  expect((await app.savedState()).plan).toBe('free');
});
