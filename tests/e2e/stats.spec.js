import { test, expect } from '@playwright/test';
import { App, freezeDate, seed } from './helpers.js';

// 4 ciclos completos: 28, 30, 27 y 29 días (regular), con síntomas y ánimo
const days = (start, n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(`${start}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10);
});
const STARTS = ['2026-07-08', '2026-08-05', '2026-09-04', '2026-10-01', '2026-10-30'];
const periodDays = STARTS.flatMap((s, i) => days(s, i === 1 ? 4 : 5));
const logs = {
  '2026-10-01': { symptoms: ['Cólicos'], mood: 'sensitive' },
  '2026-10-02': { symptoms: ['Cólicos', 'Cansancio'], mood: 'sensitive' },
  '2026-10-25': { symptoms: ['Hinchazón'], mood: 'irritable' },
  '2026-10-30': { symptoms: ['Cólicos'], mood: 'happy' },
  '2026-11-10': { mood: 'happy' },
};

test.beforeEach(async ({ page }) => { await freezeDate(page); });

async function openStats(page, plan = 'premium') {
  await seed(page, { plan, periodDays, logs });
  const app = new App(page);
  await app.goto();
  await app.openTab('Yo');
  await page.getByRole('button', { name: /Estadísticas/ }).click();
  await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible();
  return app;
}

test('estadísticas: regularidad, gráficos con datos accesibles y filtros de tiempo', async ({ page }) => {
  await openStats(page);
  await expect(page.getByText(/Regular: tus últimos 4 ciclos duraron entre 27 y 30 días/)).toBeVisible();

  // gráfico de línea: cada punto tiene su dato para lector de pantalla y su tooltip al tocar
  const chart = page.getByRole('figure', { name: 'Largo de tus ciclos' });
  await expect(chart.getByRole('button')).toHaveCount(4);
  const dot = chart.getByRole('button', { name: 'Ciclo del 5 de agosto: 30 días' });
  await dot.click();
  await expect(dot.locator('.chart__tip')).toBeVisible();

  // tabla equivalente
  const card = page.locator('.card').filter({ has: chart });
  await card.getByText('Ver como tabla').click();
  await expect(card.getByRole('row', { name: '8 de julio 28' })).toBeVisible();

  // duración del período: columnas desde cero
  await expect(page.getByRole('figure', { name: 'Duración de tus períodos' })
    .getByRole('button', { name: 'Período del 5 de agosto: 4 días' })).toBeVisible();

  // síntomas por fase (tabla real): Cólicos siempre en el período
  const heat = page.getByRole('table', { name: /Síntomas por fase/ });
  await expect(heat.getByRole('row', { name: /Cólicos/ }).getByRole('cell').first()).toHaveText('100%');
  await expect(page.getByText(/Cólicos aparece más en la fase período \(100% de las veces\)/)).toBeVisible();

  // ánimo, de más a menos
  await expect(page.getByRole('list', { name: 'Veces que registraste cada ánimo' }).getByRole('listitem').first()).toContainText('Feliz');

  // ningún gráfico ni tooltip ensancha la página (si no, la barra de abajo se corre)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // filtro "3 meses": quedan menos ciclos
  await page.getByRole('button', { name: '3 meses' }).click();
  await expect(page.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'true');
  await expect(chart.getByRole('button')).toHaveCount(2); // desde el 21/8: ciclos del 4/9 y del 1/10
});

test('estadísticas gratis: se ve la regularidad y los gráficos piden Premium', async ({ page }) => {
  await openStats(page, 'free');
  await expect(page.getByText(/Regular:/)).toBeVisible();
  await expect(page.getByText('Gráficos de tu ciclo')).toBeVisible();
  await expect(page.getByRole('figure')).toHaveCount(0);
});

test('con pocos datos, explica cuántos períodos faltan', async ({ page }) => {
  await seed(page, { plan: 'premium' }); // 3 períodos = 2 ciclos completos
  const app = new App(page);
  await app.goto();
  await app.openTab('Yo');
  await page.getByRole('button', { name: /Estadísticas/ }).click();
  await expect(page.getByText('Registrá 1 período más para saber si tu ciclo es regular.')).toBeVisible();
});
