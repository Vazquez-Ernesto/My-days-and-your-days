import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

test.describe('rol pareja (él)', () => {
  test.beforeEach(async ({ page }) => { await freezeDate(page); });

  async function enterDemo(page) {
    const app = new App(page);
    await app.goto();
    await page.getByRole('button', { name: /Soy la pareja/ }).click();
    await page.getByRole('button', { name: 'Probar con datos de ejemplo' }).click();
    return app;
  }

  test('con datos de ejemplo ve el ciclo, el momento y consejos', async ({ page }) => {
    const app = await enterDemo(page);
    await expect(page.getByText('Compartiendo con Ana')).toBeVisible();
    await app.expectRing('2', 'días para su período');
    await expect(page.getByRole('status').filter({ hasText: 'El período de Ana llega en 2 días' })).toBeVisible();
    await expect(page.locator('.partner-moment__label')).toHaveText('Sensible');
    await expect(page.getByRole('heading', { name: 'Cómo acompañarla hoy' })).toBeVisible();
    // Ella no comparte fertilidad: ni el anillo ni la barra de fases la muestran
    await expect(page.locator('.seg--fertile, .seg--ovulation, .tl--fertile, .timeline__ov')).toHaveCount(0);
    await expect(page.getByText(/un abrazo vale más que un consejo/)).toBeVisible();
    await expect(page.getByText(/Antojos/).first()).toBeVisible();
    // Solo 3 pestañas y sin botón Registrar
    await expect(app.tab('Registrar')).toHaveCount(0);
    await expect(app.tab('Avisos')).toBeVisible();
    expect((await app.savedState()).role).toBe('partner');
  });

  test('responder a su momento', async ({ page }) => {
    const app = await enterDemo(page);
    await page.getByRole('button', { name: 'Te llevo chocolate 🍫' }).click();
    await expect(page.getByText(/Enviaste “Te llevo chocolate 🍫”/)).toBeVisible();
    const { partner } = await app.savedState();
    expect(partner.replies.map((r) => r.text)).toEqual(['Te llevo chocolate 🍫']);
    expect(partner.seenMomentAt).not.toBeNull();
  });

  test('el calendario no muestra fertilidad si ella no la comparte', async ({ page }) => {
    const app = await enterDemo(page);
    await app.openTab('Calendario');
    await expect(page.getByRole('heading', { name: 'Calendario de Ana' })).toBeVisible();
    await expect(page.locator('.cal__day.is-predicted').first()).toBeVisible(); // noviembre: período previsto
    await expect(page.locator('.cal__day.is-fertile, .cal__day.is-ovulation')).toHaveCount(0);
    await page.getByRole('button', { name: 'Anterior' }).click(); // octubre: período real
    await expect(page.locator('.cal__day.is-period').first()).toBeVisible();
    await expect(page.locator('.cal__day.is-fertile, .cal__day.is-ovulation')).toHaveCount(0);
    await expect(page.getByText('Fértil', { exact: true })).toHaveCount(0);
  });

  test('desvincularse vuelve al inicio', async ({ page }) => {
    const app = await enterDemo(page);
    await app.openSettings();
    await page.getByRole('button', { name: 'Desvincular' }).click();
    await page.getByRole('button', { name: 'Sí, desvincular' }).click();
    await expect(page.getByRole('heading', { name: 'Te damos la bienvenida a My Days' })).toBeVisible();
    expect((await app.savedState()).partner.snapshot).toBeNull();
  });

  test('abrir un link de invitación precarga el código', async ({ page }) => {
    await page.goto('/#invitacion-AB2C-D3EF');
    await expect(page.getByRole('heading', { name: 'Vinculate con tu pareja' })).toBeVisible();
    await expect(page.getByLabel('Código de invitación')).toHaveValue('AB2C-D3EF');
    await page.getByRole('button', { name: 'Vincular' }).click();
    await expect(page.getByRole('status')).toContainText('llega con el servidor');
  });
});

test.describe('lado de ella', () => {
  test.beforeEach(async ({ page }) => { await freezeDate(page); await seed(page); });

  test('comparte su momento y ve cómo la ve su pareja', async ({ page }) => {
    const app = new App(page);
    await app.goto();
    await page.getByRole('button', { name: /Pensando en ti/ }).click();
    await expect(page.getByRole('button', { name: /Pensando en ti/ })).toHaveAttribute('aria-pressed', 'true');

    await app.openSettings();
    await page.getByLabel(/Tu nombre/).fill('Lucía');
    await page.getByRole('switch', { name: 'Compartir: Síntomas y ánimo' }).check();
    await page.getByRole('button', { name: 'Ver lo que ve tu pareja' }).click();

    await expect(page.getByText('Así te ve tu pareja, Lucía')).toBeVisible();
    await expect(page.locator('.partner-moment__label')).toHaveText('Pensando en ti');
    await expect(page.getByText(/mandale un mensaje/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Te llevo chocolate 🍫' })).toHaveCount(0); // en la vista previa no se responde
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
  });

  test('si deja de compartir el ciclo, la pareja no lo ve', async ({ page }) => {
    const app = new App(page);
    await app.goto();
    await app.openSettings();
    await page.getByRole('switch', { name: 'Compartir: Fase y días hasta el período' }).uncheck();
    await page.getByRole('button', { name: 'Ver lo que ve tu pareja' }).click();
    await expect(page.getByText(/no comparte su ciclo por ahora/)).toBeVisible();
    await expect(app.ringBig).toHaveCount(0);
  });

  test('invitar: muestra código, QR y link', async ({ page }) => {
    const app = new App(page);
    await app.goto();
    await app.openSettings();
    await page.getByRole('button', { name: 'Invitar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Invitar a mi pareja' });
    await expect(dialog.getByLabel('Código de invitación')).toHaveText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    await expect(dialog.getByRole('img', { name: 'Código QR de invitación' })).toBeVisible();
    const code = await dialog.getByLabel('Código de invitación').textContent();
    await expect(dialog.getByLabel('Link de invitación')).toHaveValue(new RegExp(`#invitacion-${code}$`));
    // el código se mantiene al volver a abrir
    await dialog.getByRole('button', { name: 'Cerrar' }).click();
    await page.getByRole('button', { name: 'Invitar' }).click();
    await expect(page.getByRole('dialog').getByLabel('Código de invitación')).toHaveText(code);
  });
});
