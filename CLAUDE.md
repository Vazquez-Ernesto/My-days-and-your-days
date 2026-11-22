# My Days — guía para agentes

App para seguir el ciclo menstrual con modo pareja. PWA en React 18 + Vite 7 (`src/`) y servidor
Java 21 + Spring Boot 4 (`server/`). Producción: GitHub Pages (app) + Render (servidor) + Neon (PostgreSQL).

## Reglas
- **Interfaz (HTML/CSS/JS del cliente): usar SIEMPRE `modern-web-guidance` antes de escribir código.**
  El plugin está declarado en `.claude/settings.json`. Si el plugin no está cargado, usar la CLI:
  `npx -y modern-web-guidance@latest search "<2-5 palabras en inglés>"` → `retrieve "<id>"` → aplicar →
  cerrar la respuesta con una sección `### Modern Web Guidance` (qué guía se aplicó y por qué).
- **Textos en castellano rioplatense** (voseo: "registrá", "tocá"). Sin mayúscula en cada palabra.
- **Privacidad primero**: todo lo compartido viaja cifrado de extremo a extremo (`src/lib/crypto.js`).
  La nota privada y la píldora nunca se comparten. Si ella no comparte la fertilidad, él no puede ver
  nada de fertilidad (`visiblePhase` en `src/lib/partner.js`).
- **Temas**: claro (blanco/rosa) y noche (azul cielo nocturno / rosa oscuro). Todo color sale de las
  variables de `src/styles.css`; probar siempre los dos temas.
- **Tests obligatorios** en cada cambio:
  - App: `npm test` (Vitest) y `npm run test:e2e` (Playwright; levanta el servidor Java). Correr E2E
    con `--repeat-each 3` para descartar tests inestables.
  - Servidor: `cd server && ./mvnw verify`.
  - Producción (después de publicar): `npm run test:prod`.
- **Datos de producción**: nunca borrar ni modificar datos reales de usuarios.
