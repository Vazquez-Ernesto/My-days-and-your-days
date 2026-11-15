import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

test('el manifest es válido para instalar la app', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest).toMatchObject({ short_name: 'My Days', display: 'standalone', start_url: '/' });
  expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
});

test('funciona sin internet después de la primera visita', async ({ page, context }) => {
  await freezeDate(page);
  await seed(page);
  const app = new App(page);
  await app.goto();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // ahora el service worker controla la página y cachea los assets
  await expect(app.ringBig).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await app.expectRing('11', 'días para tu período');
});

test('tema noche cuando el sistema está en modo oscuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await freezeDate(page);
  await seed(page, { settings: { theme: 'system' } });
  await new App(page).goto();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
