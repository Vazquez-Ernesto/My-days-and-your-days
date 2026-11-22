package com.mydays.billing;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class HttpMercadoPagoTest {
    @Test
    void lee_la_respuesta_de_mercado_pago() {
        MercadoPago.Preapproval p = HttpMercadoPago.parse(Map.of(
                "id", "2c938084", "status", "authorized",
                "init_point", "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=2c938084",
                "next_payment_date", "2026-12-22T10:00:00.000-04:00", "external_reference", "abc"));
        assertThat(p.status()).isEqualTo("authorized");
        assertThat(p.nextPaymentAt()).isEqualTo(Instant.parse("2026-12-22T14:00:00Z"));
        assertThat(p.externalReference()).isEqualTo("abc");
    }

    @Test
    void una_fecha_rara_no_rompe_nada() {
        assertThat(HttpMercadoPago.parse(Map.of("id", "x", "status", "pending", "next_payment_date", "mañana")).nextPaymentAt()).isNull();
    }
}
