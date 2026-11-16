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

## Etapa B — Servidor (Java 21 + Spring Boot 3 + PostgreSQL)

### Cifrado de extremo a extremo
1. Ella genera una clave AES-256-GCM en su teléfono (Web Crypto API).
2. El link de invitación lleva el código **y la clave en el fragmento** (`#invitacion-CODIGO.CLAVE`).
   El fragmento nunca se envía al servidor.
3. Ella sube el snapshot **cifrado**; él lo baja y lo descifra. El servidor solo guarda bytes ilegibles.

### Endpoints (borrador)
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/devices` | registra un dispositivo, devuelve `deviceId` + token |
| POST | `/api/pairs` | ella crea una invitación → `code` (vence en 24 h) |
| POST | `/api/pairs/{code}/join` | él acepta la invitación |
| DELETE | `/api/pairs/{id}` | cualquiera de los dos desvincula |
| PUT | `/api/pairs/{id}/snapshot` | ella sube el snapshot cifrado |
| GET | `/api/pairs/{id}/snapshot` | él lo descarga |
| POST | `/api/pairs/{id}/messages` | momentos y respuestas (cifrados) |
| POST | `/api/push/subscriptions` | guarda la suscripción Web Push del dispositivo |

### Notificaciones push
- **Web Push (VAPID)**: funciona en iPhone con la app instalada en el inicio (iOS 16.4+).
- Ella sube junto al snapshot una lista de **horarios de aviso** (sin texto); el servidor envía el push a esa
  hora con el contenido cifrado y el service worker de él lo descifra y lo muestra.
- Esto también resuelve los avisos **con la app cerrada** para ella.

### Tests
- Unitarios con JUnit 5 + Mockito; de integración con Testcontainers (PostgreSQL real).
- Contrato de la API con los tests E2E de Playwright existentes.

## Etapa C — Antes de vender
- Recuperar el vínculo al cambiar de teléfono (código de respaldo).
- Límite de intentos para códigos de invitación y vencimiento.
- Política de privacidad específica para datos de salud.
