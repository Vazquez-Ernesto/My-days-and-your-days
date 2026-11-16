import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    screenshot: 'only-on-failure',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    // El servidor Java (Spring Boot) con base H2 en memoria
    {
      command: process.platform === 'win32' ? 'cd server && mvnw.cmd -q spring-boot:run' : 'cd server && ./mvnw -q spring-boot:run',
      url: 'http://localhost:8080/actuator/health',
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    // El build de producción de la app (igual que lo que ve la usuaria, con service worker), apuntando al servidor local
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      env: { VITE_API_URL: 'http://localhost:8080' },
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
