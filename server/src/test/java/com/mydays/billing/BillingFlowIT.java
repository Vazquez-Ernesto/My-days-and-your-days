package com.mydays.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.mydays.support.MutableClock;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Suscripción a Premium de punta a punta, con un Mercado Pago falso (no se cobra nada). */
@SpringBootTest(properties = {"app.billing.usd-rate=1500", "app.push.scheduler-enabled=false"})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class BillingFlowIT {

    @TestConfiguration
    static class Fakes {
        @Bean @Primary
        MutableClock testClock() { return new MutableClock(Instant.parse("2026-11-22T12:00:00Z")); }

        @Bean @Primary
        FakeMercadoPago fakeMercadoPago() { return new FakeMercadoPago(); }
    }

    /** Un token cualquiera (no es una credencial real): solo para que los pagos figuren como habilitados. */
    @DynamicPropertySource
    static void billing(DynamicPropertyRegistry registry) {
        registry.add("app.billing.access-token", () -> UUID.randomUUID().toString());
    }

    @Autowired MockMvc mvc;
    @Autowired MutableClock clock;
    @Autowired FakeMercadoPago mp;

    String ella;

    @BeforeEach
    void registrar() throws Exception {
        ella = JsonPath.read(mvc.perform(post("/api/devices")).andReturn().getResponse().getContentAsString(), "$.token");
    }

    private MockHttpServletRequestBuilder as(String token, MockHttpServletRequestBuilder req) {
        return req.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON);
    }

    private String checkout(String period) throws Exception {
        String body = mvc.perform(as(ella, post("/api/billing/checkout"))
                        .content("{\"period\":\"" + period + "\",\"email\":\"ana@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checkoutUrl").value(startsWith("https://www.mercadopago.com.ar/")))
                .andReturn().getResponse().getContentAsString();
        String url = JsonPath.read(body, "$.checkoutUrl");
        return url.substring(url.indexOf("preapproval_id=") + "preapproval_id=".length());
    }

    @Test
    void precios_publicos_en_dolares_y_en_pesos() throws Exception {
        mvc.perform(get("/api/billing/prices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.trialDays").value(7))
                .andExpect(jsonPath("$.monthly.usd").value(2.99))
                .andExpect(jsonPath("$.monthly.ars").value(4485))   // 2,99 × 1500
                .andExpect(jsonPath("$.yearly.ars").value(29985));  // 19,99 × 1500
    }

    @Test
    void suscribirse_pagar_y_quedar_premium() throws Exception {
        String id = checkout("YEARLY");

        MercadoPago.NewPreapproval pedido = mp.created.get(0);
        assertThat(pedido.frequencyMonths()).isEqualTo(12);
        assertThat(pedido.amountArs()).isEqualByComparingTo(new BigDecimal("29985"));
        assertThat(pedido.trialDays()).isEqualTo(7);
        assertThat(pedido.payerEmail()).isEqualTo("ana@example.com");

        // todavía no pagó: sigue en gratis
        mvc.perform(as(ella, get("/api/billing/me")))
                .andExpect(jsonPath("$.plan").value("free"))
                .andExpect(jsonPath("$.status").value("pending"));

        // pagó en Mercado Pago y llega el aviso
        mp.set(id, MercadoPago.AUTHORIZED, Instant.parse("2026-11-29T12:00:00Z"));
        mvc.perform(post("/api/billing/webhook").param("type", "subscription_preapproval").param("data.id", id))
                .andExpect(status().isOk());

        mvc.perform(as(ella, get("/api/billing/me")))
                .andExpect(jsonPath("$.plan").value("premium"))
                .andExpect(jsonPath("$.status").value("authorized"))
                .andExpect(jsonPath("$.period").value("YEARLY"))
                .andExpect(jsonPath("$.nextPaymentAt").value("2026-11-29T12:00:00Z"));
    }

    @Test
    void sin_webhook_igual_se_entera_al_volver_de_mercado_pago() throws Exception {
        String id = checkout("MONTHLY");
        mp.set(id, MercadoPago.AUTHORIZED, Instant.parse("2026-11-29T12:00:00Z"));
        mvc.perform(as(ella, get("/api/billing/me"))).andExpect(jsonPath("$.plan").value("premium"));
    }

    @Test
    void un_aviso_falso_no_activa_premium() throws Exception {
        String id = checkout("MONTHLY");
        // alguien manda un webhook diciendo "authorized": lo ignoramos y le preguntamos a Mercado Pago
        mvc.perform(post("/api/billing/webhook").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"subscription_preapproval\",\"data\":{\"id\":\"" + id + "\"},\"status\":\"authorized\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/billing/webhook").param("type", "subscription_preapproval").param("data.id", "no-existe"))
                .andExpect(status().isOk());
        mvc.perform(as(ella, get("/api/billing/me"))).andExpect(jsonPath("$.plan").value("free"));
    }

    @Test
    void cancelar_mantiene_premium_hasta_el_fin_del_periodo_y_no_repite_la_prueba_gratis() throws Exception {
        String id = checkout("MONTHLY");
        mp.set(id, MercadoPago.AUTHORIZED, Instant.parse("2026-12-22T12:00:00Z"));
        mvc.perform(as(ella, get("/api/billing/me"))).andExpect(jsonPath("$.plan").value("premium"));

        // no puede suscribirse dos veces
        mvc.perform(as(ella, post("/api/billing/checkout")).content("{\"period\":\"MONTHLY\",\"email\":\"ana@example.com\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_PREMIUM"));

        mvc.perform(as(ella, post("/api/billing/cancel")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"))
                .andExpect(jsonPath("$.plan").value("premium")); // ya pagó este mes

        clock.advance(Duration.ofDays(31));
        mvc.perform(as(ella, get("/api/billing/me"))).andExpect(jsonPath("$.plan").value("free"));

        checkout("MONTHLY");
        assertThat(mp.created.get(1).trialDays()).isZero(); // la prueba gratis es una sola vez
    }

    @Test
    void si_mercado_pago_esta_caido_usa_el_ultimo_estado_conocido() throws Exception {
        String id = checkout("MONTHLY");
        mp.set(id, MercadoPago.AUTHORIZED, Instant.parse("2026-12-22T12:00:00Z"));
        mvc.perform(as(ella, get("/api/billing/me"))).andExpect(jsonPath("$.plan").value("premium"));
        mp.down = true;
        clock.advance(Duration.ofHours(7)); // toca re-consultar, pero no responde
        mvc.perform(as(ella, get("/api/billing/me"))).andExpect(jsonPath("$.plan").value("premium"));
    }

    @Test
    void validaciones_y_autenticacion() throws Exception {
        mvc.perform(as(ella, post("/api/billing/checkout")).content("{\"period\":\"MONTHLY\",\"email\":\"no-es-mail\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(get("/api/billing/me")).andExpect(status().isUnauthorized());
        mvc.perform(as(ella, post("/api/billing/cancel")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NO_SUBSCRIPTION"));
    }
}
