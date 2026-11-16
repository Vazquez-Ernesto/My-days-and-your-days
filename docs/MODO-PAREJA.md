# Modo pareja: diseño

## Roles
- **Ella** ("Llevo mi ciclo"): registra su ciclo y decide qué comparte.
- **Él** ("Soy la pareja"): ve lo que ella comparte, recibe avisos y le responde.

Decisión de producto: el modo pareja es **gratis** mientras crecemos.

## Qué comparte ella (lo decide con interruptores)
| Permiso | Por defecto | Contenido |
|---|---|---|
| Fase y días hasta el período | ✅ | días de período, largo de ciclo y de período |
| Mi momento | ✅ | últimos 10 momentos ("Sensible", "Extraño tu voz"…) y su deseo |
| Síntomas y ánimo | ⬜ | síntomas y ánimo de los últimos 30 días |
| Ventana fértil y ovulación | ⬜ | si está apagado, él no ve fertilidad en ningún lado |

**Nunca se comparten:** notas, relaciones sexuales, peso, temperatura ni píldora.
Lo garantiza `buildSnapshot()` en `src/lib/partner.js` (con tests).

## Snapshot (lo que viaja de ella a él)
```json
{
  "v": 1, "name": "Ana", "updatedAt": "2026-11-16T18:00:00Z",
  "shares": { "cycle": true, "moments": true, "symptoms": false, "fertile": false },
  "cycle": { "periodDays": ["2026-10-25", "..."], "cycleLength": 28, "periodLength": 5 },
  "moments": [{ "id": "sensitive", "at": "2026-11-16T17:20:00Z" }],
  "desire": { "level": 35, "at": "..." },
  "days": { "2026-11-16": { "symptoms": ["Antojos"], "mood": "sensitive" } }
}
```

## Etapa A ✅ (sin servidor)
- Elección de rol al empezar, pantallas de él (Hoy, Calendario, Avisos, Ajustes).
- Ella: "Mi momento" + deseo en Hoy; en Ajustes: nombre, permisos, **Invitar** (QR + link) y **Ver lo que ve tu pareja**.
- Él puede probar con **datos de ejemplo**. Sus respuestas quedan guardadas para enviarse en la etapa B.

## Etapa B — Servidor (Java 21 + Spring Boot 4 + PostgreSQL)

Avance:
- [x] **B1 — API** en `server/`: dispositivos, invitaciones, vínculo, snapshot y mensajes cifrados.
  27 tests (unitarios, Mockito e integración), verificados también contra PostgreSQL 16 real.
- [x] **B2 — App conectada**: cifrado AES-GCM en el teléfono (`src/lib/crypto.js`), cliente de la API (`src/lib/api.js`),
  sincronización (`src/lib/useCloudSync.js`), vincular pegando el link, respuestas de él, desvincular.
  Test E2E con dos navegadores contra el servidor real que verifica que **nada legible viaja por la red**.
- [x] **B3 — Hosting**: servidor en Render (`https://mydays-server.onrender.com`), base en Neon (PostgreSQL 18).
- [x] **B4 — Notificaciones push** (Web Push / VAPID), con la app cerrada:
  - Al instante: "Tu pareja aceptó", momento de ella → él, respuesta de él → ella.
  - Programadas: recordatorios de los próximos 7 días (período, píldora, ovulación, cita), cifrados en el teléfono.
  - El cifrado de Web Push (RFC 8291) y la firma VAPID (RFC 8292) están hechos con la JDK y verificados contra
    `http_ece` y `crypto` de Node.js. El service worker real se prueba en `src/lib/sw.test.js`.
  - Claves VAPID generadas por el servidor y guardadas en la base (`app_settings`): no hay secretos que configurar.
  - Solo se aceptan endpoints de Apple, Google, Mozilla y Microsoft (protección contra SSRF).
  - `.github/workflows/keepalive.yml` mantiene despierto el servidor gratis de Render para que los avisos salgan a horario.
  - El servidor conoce la **hora** de cada recordatorio, pero no su contenido.

### Cifrado de extremo a extremo
1. Ella genera una clave AES-256-GCM en su teléfono (Web Crypto API).
2. El link de invitación lleva el código **y la clave en el fragmento** (`#invitacion-CODIGO.CLAVE`).
   El fragmento nunca se envía al servidor.
   En iPhone, Safari y la app instalada no comparten datos: él vincula **desde la app** con "Pegar link de invitación".
3. Ella sube el snapshot **cifrado**; él lo baja y lo descifra. El servidor solo guarda bytes ilegibles.

### Endpoints (detalle en [`server/README.md`](../server/README.md))
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/devices` | registra un dispositivo, devuelve `deviceId` + token |
| POST | `/api/pairs` | ella crea una invitación → `code` (vence en 24 h) |
| POST | `/api/pairs/join` | él acepta la invitación (`{ code }`) |
| DELETE | `/api/pairs/{id}` | cualquiera de los dos desvincula |
| PUT | `/api/pairs/{id}/snapshot` | ella sube el snapshot cifrado |
| GET | `/api/pairs/{id}/snapshot` | él lo descarga |
| POST/GET | `/api/pairs/{id}/messages` | momentos y respuestas (cifrados) |
| POST | `/api/push/subscriptions` | guarda la suscripción Web Push del dispositivo (B4) |

### Notificaciones push
- **Web Push (VAPID)**: funciona en iPhone con la app instalada en el inicio (iOS 16.4+).
- Ella sube junto al snapshot una lista de **horarios de aviso** (sin texto); el servidor envía el push a esa
  hora con el contenido cifrado y el service worker de él lo descifra y lo muestra.
- Esto también resuelve los avisos **con la app cerrada** para ella.

### Tests
- Unitarios con JUnit 5 + Mockito; integración con MockMvc (H2) y en CI contra PostgreSQL 16 real.
- Contrato de la API con los tests E2E de Playwright existentes.

## Etapa C — Antes de vender
- Recuperar el vínculo al cambiar de teléfono (código de respaldo).
- Límite de intentos para códigos de invitación y vencimiento.
- Política de privacidad específica para datos de salud.
