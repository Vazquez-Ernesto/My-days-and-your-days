# My Days 🌸

App para llevar el control del ciclo menstrual — para ella y para su pareja ("my days and your days").

Hecha con **React 18 + Vite**. Los datos se guardan solo en el dispositivo (`localStorage`).

## Cómo correrla

Requisito: **Node.js 20.19 o más nuevo** (`node -v` para verlo).

```bash
npm install
npm run dev      # abre http://localhost:5173
npm test         # tests unitarios (Vitest)
npm run test:e2e # tests E2E (Playwright, compila y levanta la app sola)
npm run build    # build de producción en dist/
npm run preview  # sirve el build (acá sí funciona offline / instalable)
```

### En Windows PowerShell 5.1
PowerShell 5.1 no acepta `&&`. Corré los comandos de a uno, o separalos con `;`:

```powershell
npm run build; npm run preview
```

## Estructura

```
src/
  lib/          lógica pura (fechas y motor de predicción) + tests
  state/        estado global (Context + localStorage) y planes Gratis/Premium
  components/   anillo del ciclo, calendario, registro diario, candados Premium
  screens/      Onboarding, Hoy, Calendario, Recordatorios, Yo, Ajustes, Planes, PIN
  styles.css    temas claro (blanco/rosa) y noche (azul/rosa oscuro)
public/         manifest, service worker (offline) e íconos
tests/e2e/      tests Playwright + helpers (page object, fecha congelada, mocks)
docs/ANALISIS-Y-ROADMAP.md   análisis de competencia y plan hasta la venta
```

Qué es Premium se define en un solo lugar: `src/state/plans.js`.

> Las predicciones son estimaciones y no sirven como método anticonceptivo.

## Instalar en iPhone

La app se publica sola en **GitHub Pages** cada vez que se sube código a `main`
(workflow `.github/workflows/deploy.yml`). Desde el iPhone:

1. Abrí el link de GitHub Pages en **Safari** (no en Chrome).
2. Tocá **Compartir** → **Agregar a inicio** → **Agregar**.
3. Abrí My Days desde el ícono: funciona a pantalla completa y sin internet.

Para recibir notificaciones en iPhone, la app tiene que estar instalada en el inicio (iOS 16.4 o más nuevo).
Cada teléfono guarda sus propios datos: no se comparten entre dispositivos.
