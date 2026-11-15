import { expect } from '@playwright/test';

export const TODAY = '2026-11-20';

/** Congela la fecha del navegador para que los tests den siempre lo mismo. */
export async function freezeDate(page, iso = TODAY) {
  await page.clock.setFixedTime(new Date(`${iso}T10:00:00`));
}

/** Arma N días consecutivos desde `start`. */
export function days(start, n) {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Carga datos en localStorage ANTES de que arranque la app (salta el onboarding). */
export async function seed(page, overrides = {}) {
  const state = {
    onboarded: true,
    periodDays: [...days('2026-09-08', 5), ...days('2026-10-06', 5), ...days('2026-11-03', 5)],
    logs: {},
    plan: 'free',
    notified: [],
    ...overrides,
    settings: { cycleLength: 28, periodLength: 5, theme: 'light', pin: null, ...overrides.settings },
  };
  await page.addInitScript((s) => {
    if (!localStorage.getItem('mydays:v1')) localStorage.setItem('mydays:v1', JSON.stringify(s));
  }, state);
}

/**
 * Simula la API de notificaciones (Chromium headless siempre responde 'denied').
 * Las notificaciones enviadas quedan en sessionStorage para poder verificarlas.
 */
export async function mockNotifications(page, permission = 'granted') {
  await page.addInitScript((perm) => {
    const record = (title, opts) => {
      const list = JSON.parse(sessionStorage.getItem('__notifications') || '[]');
      list.push({ title, body: opts?.body });
      sessionStorage.setItem('__notifications', JSON.stringify(list));
    };
    class FakeNotification {
      static permission = perm;
      static requestPermission = async () => perm;
      constructor(title, opts) { record(title, opts); }
    }
    window.Notification = FakeNotification;
    if (window.ServiceWorkerRegistration) {
      ServiceWorkerRegistration.prototype.showNotification = async (title, opts) => record(title, opts);
    }
  }, permission);
}

export async function sentNotifications(page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('__notifications') || '[]'));
}

/** Page Object: acciones comunes de la app. */
export class App {
  constructor(page) {
    this.page = page;
    this.ringBig = page.locator('.ring__big');
    this.ringSmall = page.locator('.ring__small');
  }
  async goto() { await this.page.goto('/'); }
  tab(name) { return this.page.getByRole('navigation').getByRole('button', { name }); }
  async openTab(name) { await this.tab(name).click(); }
  async expectRing(big, small) {
    await expect(this.ringBig).toHaveText(big);
    await expect(this.ringSmall).toHaveText(small);
  }
  async savedState() {
    return this.page.evaluate(() => JSON.parse(localStorage.getItem('mydays:v1')));
  }
}
