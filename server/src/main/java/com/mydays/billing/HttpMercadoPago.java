package com.mydays.billing;

import com.mydays.common.ApiException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Cliente HTTP real de Mercado Pago (https://api.mercadopago.com). */
@Component
class HttpMercadoPago implements MercadoPago {
    private static final Logger log = LoggerFactory.getLogger(HttpMercadoPago.class);
    private final RestClient http;

    HttpMercadoPago(BillingProperties props) {
        SimpleClientHttpRequestFactory timeouts = new SimpleClientHttpRequestFactory();
        timeouts.setConnectTimeout(10_000);
        timeouts.setReadTimeout(20_000);
        this.http = RestClient.builder()
                .baseUrl(props.apiBase())
                .requestFactory(timeouts)
                .defaultHeader("Authorization", "Bearer " + (props.accessToken() == null ? "" : props.accessToken()))
                .build();
    }

    @Override
    public Preapproval create(NewPreapproval r) {
        Map<String, Object> recurring = new LinkedHashMap<>();
        recurring.put("frequency", r.frequencyMonths());
        recurring.put("frequency_type", "months");
        recurring.put("transaction_amount", r.amountArs());
        recurring.put("currency_id", "ARS");
        if (r.trialDays() > 0) recurring.put("free_trial", Map.of("frequency", r.trialDays(), "frequency_type", "days"));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("reason", r.reason());
        body.put("external_reference", r.externalReference());
        body.put("payer_email", r.payerEmail());
        body.put("auto_recurring", recurring);
        body.put("back_url", r.backUrl());
        body.put("status", PENDING);
        return call(() -> http.post().uri("/preapproval")
                .header("X-Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON).body(body)
                .retrieve().body(Map.class));
    }

    @Override
    public Preapproval get(String id) {
        return call(() -> http.get().uri("/preapproval/{id}", id).retrieve().body(Map.class));
    }

    @Override
    public Preapproval cancel(String id) {
        return call(() -> http.put().uri("/preapproval/{id}", id)
                .contentType(MediaType.APPLICATION_JSON).body(Map.of("status", CANCELLED))
                .retrieve().body(Map.class));
    }

    private Preapproval call(java.util.function.Supplier<Map<?, ?>> request) {
        try {
            return parse(request.get());
        } catch (RestClientException e) {
            log.warn("Mercado Pago respondió con error: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_PROVIDER_ERROR",
                    "Mercado Pago no respondió bien. Probá de nuevo en un rato.");
        }
    }

    static Preapproval parse(Map<?, ?> json) {
        if (json == null) throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_PROVIDER_ERROR", "Respuesta vacía de Mercado Pago");
        return new Preapproval(
                str(json.get("id")), str(json.get("status")), str(json.get("init_point")),
                instant(json.get("next_payment_date")), str(json.get("external_reference")));
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }

    private static java.time.Instant instant(Object o) {
        if (o == null) return null;
        try {
            return OffsetDateTime.parse(o.toString()).toInstant();
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
