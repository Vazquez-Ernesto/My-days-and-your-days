import { test, expect } from '@playwright/test';
import { App, seed } from './helpers.js';

/**
 * Prueba de punta a punta del modo pareja con DOS navegadores (el teléfono de ella y el de él)
 * contra el servidor Java real. Verifica también que lo que viaja por la red esté cifrado.
 */
test.describe('modo pareja real (ella ↔ servidor ↔ él)', () => {
  test.describe.configure({ mode: 'serial' });

  async function openPhones(browser) {
    const her = await (await browser.newContext()).newPage();
    const him = await (await browser.newContext()).newPage();
    await seed(her, { sharing: { name: 'Ana' } });
    return { her, him, herApp: new App(her), himApp: new App(him) };
  }

  async function createInvite(her, herApp) {
    await herApp.goto();
    await herApp.openSettings();
    await her.getByRole('button', { name: 'Invitar' }).click();
    const link = her.getByRole('dialog').getByLabel('Link de invitación');
    await expect(link).toHaveValue(/#invitacion-/);
    const value = await link.inputValue();
    await her.getByRole('button', { name: 'Cerrar' }).click();
    return value;
  }

  async function joinWith(him, himApp, link) {
    await himApp.goto();
    await him.getByRole('button', { name: /Soy la pareja/ }).click();
    await him.getByLabel('Link de invitación').fill(`Mirá, vinculate: ${link} 💞`);
    await him.getByRole('button', { name: 'Vincular' }).click();
  }

  test('vincular, compartir, responder y desvincular', async ({ browser }) => {
    const { her, him, herApp, himApp } = await openPhones(browser);

    // Espiamos lo que viaja por la red
    const sentByHer = [];
    const sentByHim = [];
    her.on('request', (r) => r.url().includes('/api/') && r.postData() && sentByHer.push(r.postData()));
    him.on('request', (r) => r.url().includes('/api/') && r.postData() && sentByHim.push(r.postData()));

    // 1) Ella invita, él pega el link (dentro de un mensaje de WhatsApp) y se vincula
    const link = await createInvite(her, herApp);
    await joinWith(him, himApp, link);
    await expect(him.getByText('¡Listo, ya están vinculados! 💞')).toBeVisible();

    // 2) Ella abre la app: detecta que él aceptó y sube sus datos cifrados
    await her.reload();
    await herApp.openSettings();
    await expect(her.getByText('Vinculada ✓')).toBeVisible();

    // 3) Él actualiza y ve el ciclo de Ana
    await him.getByRole('button', { name: 'Actualizar' }).click();
    await expect(him.getByText('Compartiendo con Ana')).toBeVisible();
    await expect(himApp.ringBig).toBeVisible();

    // 4) Ella comparte un momento; él lo ve
    await herApp.openTab('Hoy');
    await her.getByRole('button', { name: /Extraño tu voz/ }).click();
    await expect.poll(() => sentByHer.length, { timeout: 10_000 }).toBeGreaterThan(1);
    await expect(async () => {
      await him.getByRole('button', { name: 'Actualizar' }).click();
      await expect(him.locator('.partner-moment__label')).toHaveText('Extraño tu voz', { timeout: 1000 });
    }).toPass({ timeout: 15_000 });

    // 5) Él pone su nombre y le responde
    await himApp.openSettings();
    await him.getByLabel(/Tu nombre/).fill('Ernesto');
    await him.getByRole('button', { name: 'Volver' }).click();
    await him.getByRole('button', { name: 'Te llamo en un rato 📞' }).click();
    await expect(him.getByText('Enviaste “Te llamo en un rato 📞” ✓')).toBeVisible();

    // 6) Ella recibe la respuesta
    await her.reload();
    const reply = her.getByRole('status').filter({ hasText: 'Ernesto te respondió 💌' });
    await expect(reply).toBeVisible();
    await expect(reply).toContainText('Te llamo en un rato 📞');
    await reply.getByRole('button', { name: '💗 Visto' }).click();
    await expect(reply).toHaveCount(0);

    // 7) Nada legible viajó por la red: ni su nombre, ni su momento, ni la respuesta
    const traffic = [...sentByHer, ...sentByHim].join('\n');
    expect(traffic).toContain('ciphertext');
    for (const secret of ['Ana', 'missYou', 'Extraño', 'Te llamo', 'Ernesto', 'periodDays']) {
      expect(traffic).not.toContain(secret);
    }
    // y la clave de cifrado nunca se envió al servidor
    const key = link.split('.').at(-1);
    expect(traffic).not.toContain(key);

    // 8) Ella desvincula; él se entera
    await herApp.openSettings();
    await her.getByRole('button', { name: 'Desvincular' }).click();
    await her.getByRole('button', { name: 'Sí, desvincular' }).click();
    await expect(her.getByRole('button', { name: 'Invitar' })).toBeVisible();
    await him.getByRole('button', { name: 'Actualizar' }).click();
    await expect(him.getByRole('heading', { name: 'Ya no estás vinculado' })).toBeVisible();
    await him.getByRole('button', { name: 'Volver al inicio' }).click();
    await expect(him.getByRole('heading', { name: 'Te damos la bienvenida a My Days' })).toBeVisible();
  });

  test('ella no puede usar su propia invitación', async ({ browser }) => {
    const { her, herApp } = await openPhones(browser);
    const link = await createInvite(her, herApp);
    // Simulamos que ella abre su propio link en otro navegador con el MISMO teléfono registrado:
    const state = await herApp.savedState();
    const other = await (await browser.newContext()).newPage();
    await other.addInitScript((cloud) => localStorage.setItem('mydays:v1', JSON.stringify({ cloud })), state.cloud);
    await other.goto('/');
    await other.getByRole('button', { name: /Soy la pareja/ }).click();
    await other.getByLabel('Link de invitación').fill(link);
    await other.getByRole('button', { name: 'Vincular' }).click();
    await expect(other.getByRole('alert')).toContainText('Esta es tu propia invitación');
  });

  test('una invitación ya usada no sirve para un tercero', async ({ browser }) => {
    const { her, him, herApp, himApp } = await openPhones(browser);
    const link = await createInvite(her, herApp);
    await joinWith(him, himApp, link);
    await expect(him.getByText('¡Listo, ya están vinculados! 💞')).toBeVisible();

    const intruder = await (await browser.newContext()).newPage();
    await joinWith(intruder, new App(intruder), link);
    await expect(intruder.getByRole('alert')).toContainText('No encontramos esa invitación');
  });
});
