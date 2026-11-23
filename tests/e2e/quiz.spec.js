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
