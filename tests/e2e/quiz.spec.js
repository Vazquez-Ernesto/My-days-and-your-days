import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

// Vínculo "activo" sin servidor real: alcanza para ver el cuestionario guardado.
const CLOUD = { status: 'active', token: 'x', pairId: 'pair-123', key: 'A'.repeat(43), deviceId: 'd' };

test('si a cada uno le tocaron preguntas distintas (otra versión de la app), no compara y explica qué hacer', async ({ page }) => {
  await freezeDate(page);
  await seed(page, {
    cloud: CLOUD,
    quiz: { days: { '2026-11-20': { mine: [0, 1, 2, 3, 0], sent: true, theirs: [0, 1, 2, 3, 0], theirName: 'Leo', mismatch: true } } },
  });
  await page.route('http://localhost:8080/api/**', (r) => r.fulfill({ status: 503, body: '{}' })); // sin servidor
  const app = new App(page);
  await app.goto();
  const card = page.getByRole('button', { name: 'Cuestionario en pareja' });
  await expect(card).toContainText('Les tocaron preguntas distintas: actualicen la app');
  await card.click();
  await expect(page.getByRole('heading', { name: 'Les tocaron preguntas distintas' })).toBeVisible();
  await expect(page.getByText('Coincidieron en')).toHaveCount(0); // no muestra un porcentaje falso
});

test('rondas: si ya respondí y pasan los días, sigo esperando a mi pareja (no aparece una ronda nueva)', async ({ page }) => {
  await freezeDate(page, '2026-12-02');
  await seed(page, { cloud: CLOUD, quiz: { days: { r0: { mine: [0, 1, 2, 3, 0], sent: true } } } });
  await page.route('http://localhost:8080/api/**', (r) => r.fulfill({ status: 503, body: '{}' }));
  const app = new App(page);
  await app.goto();
  const card = page.getByRole('button', { name: 'Cuestionario en pareja' });
  await expect(card).toContainText('Esperando que');
  await expect(card.getByLabel('Tiempo restante')).toHaveCount(0); // con rondas no hay cuenta regresiva
  await card.click();
  await expect(page.getByRole('heading', { name: 'Ronda 1' })).toBeVisible();
  await expect(page.getByText('Las preguntas siguientes aparecen al día siguiente de que respondan los dos.')).toBeVisible();
});

test('rondas: sin responder durante días, la ronda sigue disponible y se guarda en su número', async ({ page }) => {
  await freezeDate(page, '2026-12-02');
  await seed(page, {
    cloud: CLOUD,
    quiz: { days: { r0: { mine: [0, 0, 0, 0, 0], theirs: [1, 1, 1, 1, 1], completedOn: '2026-11-26' } } },
  });
  await page.route('http://localhost:8080/api/**', (r) => r.fulfill({ status: 503, body: '{}' }));
  const app = new App(page);
  await app.goto();
  const card = page.getByRole('button', { name: 'Cuestionario en pareja' });
  await expect(card).toContainText('Ronda 2: 5 preguntas para conocerse más');
  await card.click();
  await expect(page.getByText('No vencen: estas preguntas los esperan hasta que respondan los dos.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Ronda 1' })).toContainText('0%'); // la anterior, en el historial
  await page.getByRole('button', { name: 'Empezar' }).click();
  for (let i = 0; i < 5; i++) await page.locator('.quiz__option').first().click();
  expect((await app.savedState()).quiz.days.r1.mine).toEqual([0, 0, 0, 0, 0]);
});
