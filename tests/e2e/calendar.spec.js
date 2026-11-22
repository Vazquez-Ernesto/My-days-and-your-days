import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

test.beforeEach(async ({ page }) => { await freezeDate(page); await seed(page); });

test('cada día muestra su número de día del ciclo', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  await app.openTab('Calendario');
  await expect(page.locator('[data-date="2026-11-03"]').locator('.cal__cd')).toHaveText('1');
  await expect(page.locator('[data-date="2026-11-20"]').locator('.cal__cd')).toHaveText('18');
  await page.locator('[data-date="2026-11-17"]').click();
  await expect(page.getByText('Día del ciclo: 15')).toBeVisible();
  await expect(page.getByText('Ovulación prevista')).toBeVisible();
});

test('editar período: marcar y desmarcar días tocándolos', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  await app.openTab('Calendario');
  await page.getByRole('button', { name: 'Editar período' }).click();
  await page.locator('[data-date="2026-11-08"]').click(); // agregar un día
  await page.locator('[data-date="2026-11-03"]').click(); // quitar un día
  await expect(page.locator('[data-date="2026-11-21"]')).toBeDisabled(); // no se puede marcar el futuro
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
  await expect(page.getByRole('heading', { name: 'Te damos la bienvenida a My Days' })).toBeVisible();
});

test('deslizar el dedo cambia de mes (y no selecciona un día sin querer)', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  await app.openTab('Calendario');
  const title = page.locator('.cal__title');
  await expect(title).toHaveText('Noviembre 2026');
  const box = await page.locator('.cal-card .cal__grid').boundingBox();
  const y = box.y + box.height / 2;
  const drag = async (fromX, toX) => {
    await page.mouse.move(fromX, y);
    await page.mouse.down();
    await page.mouse.move((fromX + toX) / 2, y, { steps: 4 });
    await page.mouse.move(toX, y, { steps: 4 });
    await page.mouse.up();
  };
  await drag(box.x + box.width - 20, box.x + 20); // hacia la izquierda → mes siguiente
  await expect(title).toHaveText('Diciembre 2026');
  await expect(page.locator('.day-card')).toContainText('Viernes'); // sigue seleccionado hoy (20/11), no el día donde soltó
  await drag(box.x + 20, box.x + box.width - 20); // hacia la derecha → vuelve
  await drag(box.x + 20, box.x + box.width - 20);
  await expect(title).toHaveText('Octubre 2026');
  await page.getByRole('button', { name: 'Ir a hoy' }).click();
  await expect(title).toHaveText('Noviembre 2026');
  await expect(page.locator('[data-date="2026-11-20"]')).toHaveAttribute('aria-current', 'date');
});

test('cada registro tiene su emoji en el calendario y hay referencias de qué significa cada uno', async ({ page }) => {
  const app = new App(page);
  await app.goto();
  const sheet = await app.openLog();
  await sheet.getByRole('checkbox').first().check(); // el flujo se registra en días de período
  await sheet.getByRole('button', { name: 'Manchado' }).click();
  await sheet.getByRole('button', { name: '♥ Con protección' }).click();
  await sheet.getByRole('button', { name: /Feliz/ }).click();
  await sheet.getByRole('button', { name: 'Guardar' }).click();
  await expect(sheet).toBeHidden();

  await app.openTab('Calendario');
  const day = page.getByRole('button', { name: '20 de noviembre', exact: true });
  await expect(day).toHaveAttribute('data-date', '2026-11-20');
  await expect(day.locator('.cal__marks')).toHaveText('💧❤️😊'); // manchado, sexo y ánimo: cada uno con su ícono
  await expect(day).toHaveAttribute('aria-description', /Período.*Manchado.*Relaciones con protección.*Ánimo: feliz/);

  const refs = page.locator('details.legend-more');
  await expect(refs.getByText('Relaciones sexuales')).toBeHidden();
  await refs.getByText('¿Qué significa cada ícono?').click();
  await expect(refs.getByText('Relaciones sexuales')).toBeVisible();
  await expect(refs.getByText('Manchado')).toBeVisible();
  await expect(refs.getByText('Píldora tomada')).toBeVisible();
});
