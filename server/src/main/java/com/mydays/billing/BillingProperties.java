package com.mydays.billing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuración de cobros (sección "app.billing" de application.yml).
 * Mercado Pago cobra suscripciones en PESOS: el precio se define en dólares y se convierte con {@code usdRate}.
 *
 * @param accessToken token privado de Mercado Pago (variable MP_ACCESS_TOKEN). Vacío = cobros desactivados.
 * @param usdRate     pesos por dólar (variable MP_USD_RATE). Se actualiza a mano cuando cambia la cotización.
 * @param backUrl     a dónde vuelve la persona después de pagar en Mercado Pago (tiene que ser https).
 */
@ConfigurationProperties(prefix = "app.billing")
public record BillingProperties(
        String accessToken,
        BigDecimal usdRate,
        BigDecimal monthlyUsd,
        BigDecimal yearlyUsd,
        int trialDays,
        String backUrl,
        String apiBase) {

    public boolean enabled() {
        return accessToken != null && !accessToken.isBlank() && usdRate != null && usdRate.signum() > 0;
    }

    /** Precio en dólares del período. */
    public BigDecimal usd(BillingPeriod period) {
        return period == BillingPeriod.YEARLY ? yearlyUsd : monthlyUsd;
    }

    /** Precio en pesos, redondeado a pesos enteros (así se ve prolijo en el resumen de la tarjeta). */
    public BigDecimal ars(BillingPeriod period) {
        if (usdRate == null) return null;
        return usd(period).multiply(usdRate).setScale(0, RoundingMode.HALF_UP);
    }
}
