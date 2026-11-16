// Smoke test contra PRODUCCIÓN (servidor en Render + base en Neon), con el build tal cual se publica.
// Corre solo la prueba de pareja que termina desvinculando, así no deja datos en la base.
//   npm run test:prod
import { defineConfig, devices } from '@playwright/test';

const API_URL = process.env.PROD_API_URL ?? 'https://mydays-server.onrender.com';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'couple.spec.js',
  grep: /vincular, compartir/,
  timeout: 120_000, // el plan gratis de Render puede tardar ~1 min en despertar
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'off', locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' },
  projects: [{ name: 'iphone-13', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    env: { VITE_API_URL: API_URL },
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
