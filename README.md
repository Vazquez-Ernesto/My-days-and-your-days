# My Days 🌸

App para llevar el control del ciclo menstrual — para ella y para su pareja ("my days and your days").

Hecha con **React 18 + Vite**. Los datos se guardan solo en el dispositivo (`localStorage`).

## Cómo correrla

```bash
npm install
npm run dev      # abre http://localhost:5173
npm test         # tests unitarios (Vitest)
npm run test:e2e # tests E2E (Playwright, compila y levanta la app sola)
npm run build    # build de producción en dist/
npm run preview  # sirve el build (acá sí funciona offline / instalable)
```

## Estructura

```
src/
  lib/          lógica pura (fechas y motor de predicción) + tests
  state/        estado global (Context + localStorage) y planes Gratis/Premium
  components/   anillo del ciclo, calendario, registro diario, candados Premium
  screens/      Onboarding, Hoy, Calendario, Análisis, Ajustes, Planes, PIN
  styles.css    temas claro (blanco/rosa) y noche (azul/rosa oscuro)
public/         manifest, service worker (offline) e íconos
tests/e2e/      tests Playwright + helpers (page object, fecha congelada, mocks)
docs/ANALISIS-Y-ROADMAP.md   análisis de competencia y plan hasta la venta
```

Qué es Premium se define en un solo lugar: `src/state/plans.js`.

> Las predicciones son estimaciones y no sirven como método anticonceptivo.
