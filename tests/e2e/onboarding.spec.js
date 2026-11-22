import { test, expect } from '@playwright/test';
import { App, freezeDate } from './helpers.js';

test('una usuaria nueva completa el onboarding y ve su predicción', async ({ page }) => {
  await freezeDate(page);
  const app = new App(page);
  await app.goto();

  await expect(page.getByRole('heading', { name: 'Te damos la bienvenida a My Days' })).toBeVisible();
  await page.getByRole('button', { name: /Llevo mi ciclo/ }).click();
  await page.locator('input[type=date]').fill('2026-11-10');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Más' }).nth(1).click(); // ciclo 28 → 29
  await page.getByRole('button', { name: 'Listo' }).click();

  // 10/11 + 29 días = 9/12 → faltan 19 días desde el 20/11
  await app.expectRing('19', 'días para tu período');
  await expect(page.getByText('Día 11 del ciclo')).toBeVisible();

  const state = await app.savedState();
  expect(state.settings.cycleLength).toBe(29);
  expect(state.periodDays).toHaveLength(5);
  expect(state.role).toBe('self');
});

test('quien ya usaba la app (sin rol guardado) sigue como "llevo mi ciclo"', async ({ page }) => {
  await freezeDate(page);
  await page.addInitScript(() => localStorage.setItem('mydays:v1', JSON.stringify({
    onboarded: true, periodDays: ['2026-11-03', '2026-11-04'], logs: {}, plan: 'free', settings: { cycleLength: 28, periodLength: 5 },
  })));
  const app = new App(page);
  await app.goto();
  await expect(app.ringBig).toBeVisible();
  await expect(app.tab('Yo')).toBeVisible();
  expect((await app.savedState()).role).toBe('self');
});

test('bienvenida: progreso accesible, foco en el título, volver atrás sin perder datos y vista previa', async ({ page }) => {
  await freezeDate(page);
  const app = new App(page);
  await app.goto();
  await expect(page.getByText('Compartí con tu pareja solo lo que vos elijas')).toBeVisible();
  await page.getByRole('button', { name: /Llevo mi ciclo/ }).click();

  const title1 = page.getByRole('heading', { name: '¿Cuándo empezó tu último período?' });
  await expect(title1).toBeFocused(); // el lector de pantalla anuncia el paso nuevo
  await expect(page.getByRole('list', { name: 'Progreso' }).locator('[aria-current="step"]')).toHaveText('Paso 1 de 2: Último período');
  await page.getByLabel(/Elegí el primer día/).fill('2026-11-10');
  await page.getByLabel(/Elegí el primer día/).press('Enter'); // Enter avanza (es un formulario)

  await expect(page.getByRole('heading', { name: 'Contame un poco de tu ciclo' })).toBeFocused();
  await page.getByRole('group', { name: 'Duración del ciclo' }).getByRole('button', { name: 'Más' }).click(); // 29
  await expect(page.getByText('Tu próximo período sería alrededor del 9 de diciembre')).toBeVisible();

  await page.getByRole('button', { name: '‹ Atrás' }).click();
  await expect(page.getByLabel(/Elegí el primer día/)).toHaveValue('2026-11-10'); // no se pierde lo cargado
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('group', { name: 'Duración del ciclo' })).toContainText('29 días');
  await page.getByRole('group', { name: 'Duración del período' }).getByRole('button', { name: 'Menos' }).click(); // 4
  await page.getByRole('button', { name: 'Listo' }).click();

  const state = await app.savedState();
  expect(state.settings).toMatchObject({ cycleLength: 29, periodLength: 4 });
  expect(state.periodDays).toEqual(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
});
