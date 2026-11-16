package com.mydays.common;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Inyectamos el reloj en vez de llamar a Instant.now() directamente.
 * Así los tests pueden "adelantar el tiempo" (ej. probar que una invitación vence a las 24 h)
 * sin esperar 24 horas: es la misma idea que page.clock en Playwright.
 */
@Configuration
public class ClockConfig {
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
