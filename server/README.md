# My Days — servidor (modo pareja)

API en **Java 21 + Spring Boot 4** que vincula a ella con su pareja y guarda lo que comparten
**cifrado de extremo a extremo**: el servidor nunca puede leer los datos del ciclo.

## Correrlo en tu PC

Solo necesitás **Java 21** (`java -version`). Maven no hace falta: viene el wrapper `mvnw`.

Windows (PowerShell):
```powershell
cd server
.\mvnw.cmd spring-boot:run
```

Linux / macOS:
```bash
cd server
./mvnw spring-boot:run
```

Queda en http://localhost:8080. Probá http://localhost:8080/actuator/health → `{"status":"UP"}`.
Por defecto usa una base **H2 en memoria** (se borra al apagar): no hay que instalar nada.

## Tests

```powershell
.\mvnw.cmd test      # unitarios (segundos)
.\mvnw.cmd verify    # unitarios + integración (levanta el servidor completo)
```

| Tipo | Archivo | Qué prueba |
|---|---|---|
| Unitario | `InviteCodesTest` | formato y normalización de códigos (test parametrizado) |
| Unitario + Mockito | `PairServiceTest` | reglas: vencimiento, un solo uso, no aceptar la propia invitación… |
| Integración | `ApiFlowIT` | la API completa por HTTP: flujo ella↔él, permisos, 401/403/404/410, CORS |

La CI (`.github/workflows/server.yml`) corre todo dos veces: con H2 y con **PostgreSQL 16 real**.

## Estructura (por funcionalidad)

```
src/main/java/com/mydays/
  device/   registro de teléfonos y autenticación por token (Bearer)
  pair/     invitaciones y vínculo ella ↔ él (las reglas de negocio)
  sync/     snapshot cifrado de ella y mensajes (momentos / respuestas)
  push/     notificaciones push: cifrado RFC 8291, firma VAPID, suscripciones, recordatorios programados
  common/   errores en formato estándar, reloj inyectable, CORS
src/main/resources/
  application.yml               configuración (perfil por defecto H2, perfil "postgres")
  db/migration/V1__init.sql     tablas (Flyway)
```

Cada funcionalidad tiene: **entidad** (tabla) → **repositorio** (acceso a datos) → **servicio** (reglas) → **controlador** (HTTP).

## API

Todas las rutas (salvo registrar el dispositivo) piden `Authorization: Bearer <token>`.
Los errores vuelven como `{ "status": 410, "code": "INVITE_EXPIRED", "detail": "La invitación venció…" }`.

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| POST | `/api/devices` | cualquiera | registra el teléfono → `{ deviceId, token }` |
| POST | `/api/pairs` | ella | crea o regenera la invitación (vence en 24 h) |
| POST | `/api/pairs/join` | él | acepta: `{ "code": "AB2C-D3EF" }` |
| GET | `/api/pairs/me` | los dos | estado del vínculo: `PENDING` / `ACTIVE` |
| DELETE | `/api/pairs/{id}` | los dos | desvincular (borra todo lo compartido) |
| PUT | `/api/pairs/{id}/snapshot` | ella | sube lo que comparte (cifrado) |
| GET | `/api/pairs/{id}/snapshot` | los dos | descarga lo compartido |
| POST | `/api/pairs/{id}/messages` | los dos | momento o respuesta (cifrado) |
| PUT | `/api/pairs/{id}/profile` | los dos | sube su foto y nombre (cifrados) |
| GET | `/api/pairs/{id}/profiles?since=` | los dos | perfiles actualizados desde `since` |
| GET | `/api/pairs/{id}/messages?since=` | los dos | mensajes nuevos |
| GET | `/api/push/public-key` | cualquiera | clave pública VAPID para suscribirse |
| PUT | `/api/push/subscription` | los dos | registra la suscripción push del teléfono |
| DELETE | `/api/push/subscription` | los dos | desactiva las notificaciones |
| PUT | `/api/push/schedule` | los dos | reemplaza los recordatorios programados (cifrados) |
| POST | `/api/push/test` | los dos | manda una notificación de prueba |
| GET | `/actuator/health` | hosting | ¿está vivo? |

### Códigos de error
`UNAUTHORIZED` · `INVITE_NOT_FOUND` · `INVITE_EXPIRED` · `CANNOT_JOIN_OWN_INVITE` · `ALREADY_PAIRED` ·
`NO_PAIR` · `PAIR_NOT_FOUND` · `NOT_A_MEMBER` · `OWNER_ONLY` · `NO_SNAPSHOT` · `PAIR_NOT_ACTIVE` ·
`MESSAGE_TOO_LARGE` · `VALIDATION_ERROR` · `MALFORMED_JSON` · `PUSH_ENDPOINT_NOT_ALLOWED` · `PUSH_KEYS_INVALID` ·
`NO_PUSH_SUBSCRIPTION` · `SCHEDULE_TOO_LARGE` · `PROFILE_TOO_LARGE`

## Producción (Neon)

La base es **Neon Postgres** (proyecto `jolly-scene-86700703`, rama `production`, PostgreSQL 18).
Alcanza con **una variable**: `DATABASE_URL`, tal cual la da Neon (`postgresql://usuario:clave@host/neondb?sslmode=require&channel_binding=require`).
`DatabaseUrlEnvironmentPostProcessor` la convierte al formato JDBC.

- Usá la URL **directa** (host sin `-pooler`): Flyway corre las migraciones al arrancar y no funcionan bien con PgBouncer.
  El servidor ya tiene su propio pool (Hikari, máximo 5 conexiones).
- Para correrlo en tu PC contra Neon (PowerShell), con la URL en `.env.local` (no se sube a git):
  ```powershell
  $env:DATABASE_URL = "postgresql://..."   # la URL directa de Neon
  .\mvnw.cmd spring-boot:run
  ```
- Otras variables: `PORT` (la pone el hosting).

El perfil `postgres` (usado en la CI) sigue aceptando `DATABASE_URL` en formato `jdbc:` con `DATABASE_USER` y `DATABASE_PASSWORD`.
