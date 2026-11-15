# My Days — Análisis de mercado y hoja de ruta

## 1. Análisis de la competencia ("ingeniería inversa" de producto)

Estudiamos **qué funciones y qué modelo de negocio** usan las apps líderes.
No copiamos nombre, logo, diseño ni código de ninguna: eso nos expondría a
reclamos de marca/copyright y rechazo en las tiendas.

| App | Modelo | Gratis | Pago |
|---|---|---|---|
| Period Calendar / Period Tracker ("P.C") | Freemium + anuncios | Calendario, predicción, ovulación, registro diario | Quitar anuncios (~USD 3 pago único) o Premium anual (~USD 50/año) |
| Flo | Freemium, suscripción | Seguimiento básico y predicciones | ~USD 4.99/mes o 39.99/año: sin anuncios, análisis, contenido, modo anónimo |
| Clue | Freemium, suscripción | Seguimiento, síntomas, predicción básica | Clue Plus ~USD 9.99/mes: reportes de salud, exportar historial, análisis avanzado |
| iPeriod | Freemium | Seguimiento | Sin anuncios, gráficos personalizables, exportar PDF |

### El patrón que funciona (y que replicamos)
1. **Pantalla principal = una sola pregunta:** "¿cuántos días faltan?" → anillo del ciclo con número grande.
2. **Un botón de acción principal:** "Me vino hoy" / "Terminó hoy".
3. **Calendario con código de colores:** período real, previsto, ventana fértil, ovulación.
4. **Registro diario rápido** con chips (flujo, síntomas, ánimo) + nota.
5. **Gratis generoso** (para atraer usuarias y buenas reseñas) y Premium que vende
   **comodidad, profundidad y privacidad**: sin anuncios, gráficos, exportar, PIN.
6. **Anuncios en el plan gratis** como fuente de ingresos + empuje hacia Premium.

### Nuestro diferencial
- **Privacidad primero:** sin cuenta, datos solo en el teléfono (tema sensible desde 2022; Flo y Clue tuvieron problemas legales por datos).
- **Modo pareja** ("My days and your days"): la pareja recibe avisos de las fases. Casi nadie lo hace bien → es el gancho Premium.
- Precio más bajo que Flo/Clue: **USD 2.99/mes o 19.99/año**, 7 días de prueba.

## 2. Qué incluye el MVP (v0.1 — este commit)

- Onboarding en 3 pasos (último período, duración del período y del ciclo)
- Inicio: anillo del ciclo, días restantes, fase actual con consejo, "Me vino / Terminó hoy", próximos períodos
- Calendario mensual con período, previsto, fértil, ovulación y días con registro
- Registro diario: período sí/no, flujo, ánimo, 10 síntomas, notas
- Estadísticas: promedios reales (últimos 6 ciclos) + historial
- Premium (simulado): gráficos de ciclos y síntomas, predicciones a 12 meses, exportar CSV, PIN, modo pareja (placeholder), sin anuncios
- Tema claro (blanco/rosa), noche (azul cielo nocturno/rosa oscuro) o automático según el sistema
- 21 tests unitarios del motor de predicción

## 3. Hoja de ruta hacia la venta

### v0.2 — PWA instalable (1–2 semanas)
- [ ] `manifest.json` + service worker → se instala en el celular y funciona offline
- [ ] Recordatorios (notificaciones) X días antes del período
- [ ] Tests E2E con Playwright en CI (GitHub Actions)
- [ ] Ícono y nombre definitivo (verificar que la marca esté libre)

### v0.3 — App en tiendas (3–4 semanas)
- [ ] Empaquetar con **Capacitor** (reusa este mismo código React) → Android e iOS
- [ ] Anuncios reales en Gratis con **AdMob** (banner discreto, nunca en el registro)
- [ ] Compras con **RevenueCat** (simplifica Google Play Billing + App Store y la validación)
- [ ] Política de privacidad y términos (obligatorio en tiendas para apps de salud)

### v0.4 — Backend para Modo Pareja (4–6 semanas)
- [ ] Backend en **Java (Spring Boot)** — ideal para practicar lo que estás aprendiendo
- [ ] Cifrado de extremo a extremo de lo compartido; la pareja solo ve fases, no síntomas
- [ ] Sincronización/backup opcional en la nube (Premium)

### v1.0 — Lanzamiento
- [ ] Ficha de tienda (capturas en ambos temas), ASO en español
- [ ] Métricas: conversión Gratis → Premium (objetivo inicial 2–4%)
- [ ] Modo embarazo y modo "buscando embarazo" (contenido Premium)

## 4. Aviso importante
Las predicciones son estimaciones estadísticas. La app debe decir claramente que
**no es un método anticonceptivo ni un dispositivo médico** (ya está en la pantalla de inicio).
