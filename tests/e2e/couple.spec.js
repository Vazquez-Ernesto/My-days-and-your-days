import { test, expect } from '@playwright/test';
import { App, seed, freezeDate } from './helpers.js';

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

  test('su día compartido (con permisos) y cuestionario en pareja', async ({ browser }) => {
    const { her, him, herApp, himApp } = await openPhones(browser);
    const link = await createInvite(her, herApp);
    await joinWith(him, himApp, link);
    await expect(him.getByText('¡Listo, ya están vinculados! 💞')).toBeVisible();
    await her.reload();

    // 1) Ella marca manchado y le deja una nota
    await herApp.openTab('Hoy');
    const sheet = await herApp.openLog();
    await sheet.getByRole('checkbox').first().check(); // tengo el período este día
    await sheet.getByRole('button', { name: 'Manchado' }).click();
    await sheet.getByLabel('Nota para tu pareja').fill('Hoy estoy re mimosa, traé helado 🍦');
    await sheet.getByLabel('Notas privadas', { exact: false }).count(); // existe aparte
    await sheet.locator('#log-note').fill('Esto es privado');
    await sheet.getByRole('button', { name: 'Guardar' }).click();

    const herDay = him.locator('.card').filter({ hasText: 'Su día hoy' });
    await expect(async () => {
      await him.getByRole('button', { name: 'Actualizar' }).click();
      await expect(herDay).toContainText('traé helado', { timeout: 1000 });
    }).toPass({ timeout: 20_000 });
    await expect(herDay).toContainText('Manchado');
    await expect(him.getByText('Esto es privado')).toHaveCount(0); // la nota privada nunca llega

    // 2) Ella deja de compartir el flujo → él ya no lo ve
    await herApp.openSettings();
    await her.getByRole('switch', { name: 'Compartir: Flujo del período' }).uncheck();
    await her.getByRole('button', { name: 'Volver' }).click();
    await expect(async () => {
      await him.getByRole('button', { name: 'Actualizar' }).click();
      await expect(herDay).not.toContainText('Manchado', { timeout: 1000 });
    }).toPass({ timeout: 20_000 });
    await expect(herDay).toContainText('traé helado'); // la nota sigue

    // 3) Cuestionario: ella responde primero
    await her.getByRole('button', { name: 'Cuestionario en pareja' }).click();
    await her.getByRole('button', { name: 'Empezar' }).click();
    const herPicks = [];
    for (let i = 0; i < 5; i++) {
      const opt = her.locator('.quiz__option').nth(i % 4);
      herPicks.push(await opt.textContent());
      await opt.click();
    }
    await expect(her.getByText(/Cuando .* responda, te avisamos/)).toBeVisible();
    await expect(her.getByText('Respuesta pendiente')).toBeVisible();

    // Él ve que tiene que responder, y NO ve las respuestas de ella
    await him.getByRole('button', { name: 'Actualizar' }).click();
    await him.getByRole('button', { name: 'Cuestionario en pareja' }).click();
    await expect(him.getByRole('button', { name: 'Empezar' })).toBeVisible();
    await expect(him.getByText('Coincidieron en')).toHaveCount(0);
    await him.getByRole('button', { name: 'Empezar' }).click();
    for (let i = 0; i < 5; i++) await him.locator('.quiz__option').nth(i % 4).click(); // responde igual que ella

    // 4) Los dos ven el mismo resultado
    await expect(him.getByText('¡Almas gemelas!', { exact: false })).toBeVisible({ timeout: 20_000 });
    await expect(him.getByText('Coincidieron en 5 de 5')).toBeVisible();
    await expect(async () => {
      await her.reload();
      await her.getByRole('button', { name: 'Cuestionario en pareja' }).click();
      await expect(her.getByText('Coincidieron en 5 de 5')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 25_000 });
    await expect(her.locator('.quiz__detail').first()).toContainText(herPicks[0].trim());
  });

  test('fotos de perfil: cada uno sube la suya, los dos ven la del otro (cifradas)', async ({ browser }) => {
    const { her, him, herApp, himApp } = await openPhones(browser);
    const sent = [];
    for (const p of [her, him]) p.on('request', (r) => r.url().includes('/profile') && r.postData() && sent.push(r.postData()));
    const link = await createInvite(her, herApp);
    await joinWith(him, himApp, link);
    await expect(him.getByText('¡Listo, ya están vinculados! 💞')).toBeVisible();

    // Imagen de prueba generada en el navegador (un cuadrado de color)
    const photo = async (page, color) => Buffer.from(await page.evaluate((c) => {
      const cv = document.createElement('canvas'); cv.width = 300; cv.height = 200;
      const ctx = cv.getContext('2d'); ctx.fillStyle = c; ctx.fillRect(0, 0, 300, 200);
      return cv.toDataURL('image/png').split(',')[1];
    }, color), 'base64');
    const upload = async (page, app, color) => {
      await app.openSettings();
      await page.locator('input[type=file]').setInputFiles({ name: 'yo.png', mimeType: 'image/png', buffer: await photo(page, color) });
      await expect(page.locator('.profile-card img')).toHaveAttribute('src', /^data:image\/jpeg/);
      await page.getByRole('button', { name: 'Volver' }).click();
    };

    await her.reload();
    await upload(her, herApp, '#e91e63');
    await upload(him, himApp, '#3f51b5');
    await him.getByLabel(/Tu nombre/).count(); // (su nombre lo pone en Ajustes)
    await himApp.openSettings();
    await him.getByLabel(/Tu nombre/).fill('Ernesto');
    await him.getByRole('button', { name: 'Volver' }).click();

    // Él ve la foto de Ana en "Compartiendo con Ana"
    await expect(async () => {
      await him.getByRole('button', { name: 'Actualizar' }).click();
      await expect(him.locator('.couple-card').getByRole('img', { name: 'Foto de Ana' })).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 25_000 });

    // Ella ve la foto y el nombre de él
    await expect(async () => {
      await her.reload();
      await expect(her.getByRole('img', { name: 'Foto de Ernesto' })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 25_000 });
    await expect(her.getByText('Compartiendo con Ernesto')).toBeVisible();

    // Nada legible viajó: ni la imagen ni los nombres
    expect(sent.length).toBeGreaterThanOrEqual(2);
    for (const body of sent) {
      expect(body).not.toContain('data:image');
      expect(body).not.toContain('Ernesto');
    }
  });

  test('si las fotos fallan (ej. el servidor se está actualizando), igual le llegan los datos de ella', async ({ browser }) => {
    const { her, him, herApp, himApp } = await openPhones(browser);
    // Simulamos que el endpoint de fotos no responde, del lado de los dos
    for (const p of [her, him]) await p.route('**/profile*', (r) => r.fulfill({ status: 503, body: '{}' }));
    const link = await createInvite(her, herApp);
    await joinWith(him, himApp, link);
    await her.reload();
    await expect(async () => {
      await him.getByRole('button', { name: 'Actualizar' }).click();
      await expect(him.getByText('Compartiendo con Ana')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 20_000 });
    await expect(himApp.ringBig).toBeVisible();
  });

  test('cuestionario por rondas: si uno responde días después, le tocan las mismas preguntas', async ({ browser }) => {
    const { her, him, herApp, himApp } = await openPhones(browser);
    const link = await createInvite(her, herApp);
    await joinWith(him, himApp, link);
    await expect(him.getByText('¡Listo, ya están vinculados! 💞')).toBeVisible();
    // ya vinculados, "viajamos" a una fecha con rondas (la invitación ya no importa)
    await freezeDate(her, '2026-11-27');
    await freezeDate(him, '2026-11-27');
    await her.reload();
    await him.reload();

    // Ella responde la ronda 1 el 27/11
    await her.getByRole('button', { name: 'Cuestionario en pareja' }).click();
    await expect(her.getByRole('heading', { name: 'Ronda 1' })).toBeVisible();
    await her.getByRole('button', { name: 'Empezar' }).click();
    const herQuestions = [];
    for (let i = 0; i < 5; i++) {
      herQuestions.push(await her.locator('.quiz__question').textContent());
      await her.locator('.quiz__option').nth(i % 4).click();
    }
    await expect(her.getByText(/Cuando .* responda, te avisamos/)).toBeVisible();

    // Él recién entra dos días después: la ronda sigue abierta, con LAS MISMAS preguntas
    await freezeDate(him, '2026-11-29');
    await him.reload();
    await him.getByRole('button', { name: 'Cuestionario en pareja' }).click();
    await expect(him.getByRole('heading', { name: 'Ronda 1' })).toBeVisible();
    await him.getByRole('button', { name: 'Empezar' }).click();
    for (let i = 0; i < 5; i++) {
      await expect(him.locator('.quiz__question')).toHaveText(herQuestions[i]);
      await him.locator('.quiz__option').nth(i % 4).click();
    }
    await expect(him.getByText('Coincidieron en 5 de 5')).toBeVisible({ timeout: 20_000 });

    // A ella también le llegan los resultados (con las mismas preguntas: no hay aviso de versiones distintas)
    await expect(async () => {
      await her.reload();
      await her.getByRole('button', { name: 'Cuestionario en pareja' }).click();
      await expect(her.getByText('Coincidieron en 5 de 5')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 25_000 });
    expect((await herApp.savedState()).quiz.days.r0).toMatchObject({ mine: [0, 1, 2, 3, 0], theirs: [0, 1, 2, 3, 0] });

    // Al día siguiente de completarla, aparece la ronda 2 con preguntas nuevas
    await freezeDate(him, '2026-11-30');
    await him.reload();
    await him.getByRole('button', { name: 'Cuestionario en pareja' }).click();
    await expect(him.getByRole('heading', { name: 'Ronda 2' })).toBeVisible();
    await him.getByRole('button', { name: 'Empezar' }).click();
    await expect(him.locator('.quiz__question')).not.toHaveText(herQuestions[0]);
  });
});
