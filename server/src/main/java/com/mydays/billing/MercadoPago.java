package com.mydays.billing;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Lo que usamos de la API de suscripciones de Mercado Pago ("preapproval").
 * Es una interfaz para poder reemplazarla por una falsa en los tests (no se cobra nada al testear).
 */
public interface MercadoPago {
    String PENDING = "pending";
    String AUTHORIZED = "authorized";
    String PAUSED = "paused";
    String CANCELLED = "cancelled";

    /** Crea la suscripción y devuelve el link (initPoint) donde la persona carga su medio de pago. */
    Preapproval create(NewPreapproval request);

    Preapproval get(String id);

    Preapproval cancel(String id);

    record NewPreapproval(String reason, String externalReference, String payerEmail,
                          BigDecimal amountArs, int frequencyMonths, int trialDays, String backUrl) { }

    record Preapproval(String id, String status, String initPoint, Instant nextPaymentAt, String externalReference) { }
}
