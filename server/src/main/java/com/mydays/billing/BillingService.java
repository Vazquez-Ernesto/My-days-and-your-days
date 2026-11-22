package com.mydays.billing;

import com.mydays.common.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reglas de la suscripción a Premium.
 * Regla de oro: el estado SIEMPRE se le pregunta a Mercado Pago (nunca creemos lo que dice el navegador
 * ni el cuerpo de un webhook, que cualquiera podría falsificar).
 */
@Service
public class BillingService {
    private static final Logger log = LoggerFactory.getLogger(BillingService.class);
    /** Cada cuánto re-consultamos a Mercado Pago una suscripción activa (por si se canceló desde su app). */
    static final Duration REFRESH_EVERY = Duration.ofHours(6);

    private final BillingProperties props;
    private final MercadoPago mp;
    private final SubscriptionRepository subs;
    private final Clock clock;

    public BillingService(BillingProperties props, MercadoPago mp, SubscriptionRepository subs, Clock clock) {
        this.props = props;
        this.mp = mp;
        this.subs = subs;
        this.clock = clock;
    }

    public record Price(BigDecimal usd, BigDecimal ars) { }
    public record Prices(boolean enabled, int trialDays, Price monthly, Price yearly) { }
    public record Status(String plan, String status, BillingPeriod period, Instant nextPaymentAt, BigDecimal amountArs) {
        static final Status FREE = new Status("free", null, null, null, null);
    }

    public Prices prices() {
        return new Prices(props.enabled(), props.trialDays(),
                new Price(props.monthlyUsd(), props.ars(BillingPeriod.MONTHLY)),
                new Price(props.yearlyUsd(), props.ars(BillingPeriod.YEARLY)));
    }

    /** Crea la suscripción en Mercado Pago y devuelve el link para pagar. */
    @Transactional
    public String checkout(UUID deviceId, BillingPeriod period, String email) {
        if (!props.enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_DISABLED", "Los pagos todavía no están habilitados");
        }
        Instant now = clock.instant();
        Optional<Subscription> previous = subs.findFirstByDeviceIdOrderByCreatedAtDesc(deviceId);
        if (previous.filter(s -> MercadoPago.AUTHORIZED.equals(s.getStatus())).isPresent()) {
            throw ApiException.conflict("ALREADY_PREMIUM", "Ya tenés una suscripción activa");
        }
        // La prueba gratis es una sola vez: si ya hubo una suscripción que llegó a activarse, no se repite.
        boolean usedTrial = previous.filter(s -> !MercadoPago.PENDING.equals(s.getStatus())).isPresent();

        Subscription sub = subs.save(new Subscription(UUID.randomUUID(), deviceId, period, props.ars(period), now));
        MercadoPago.Preapproval created = mp.create(new MercadoPago.NewPreapproval(
                "My Days Premium (" + period.label + ")", sub.getId().toString(), email.trim(),
                sub.getAmountArs(), period.months, usedTrial ? 0 : props.trialDays(), props.backUrl()));
        sub.apply(created, now);
        if (created.initPoint() == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_PROVIDER_ERROR", "Mercado Pago no devolvió el link de pago");
        }
        return created.initPoint();
    }

    /** Estado del plan de este teléfono. Si hace falta, lo actualiza preguntándole a Mercado Pago. */
    @Transactional
    public Status status(UUID deviceId) {
        Instant now = clock.instant();
        return subs.findFirstByDeviceIdOrderByCreatedAtDesc(deviceId)
                .map(sub -> {
                    boolean stale = MercadoPago.PENDING.equals(sub.getStatus())
                            || (!MercadoPago.CANCELLED.equals(sub.getStatus()) && sub.getUpdatedAt().plus(REFRESH_EVERY).isBefore(now));
                    if (stale) refreshQuietly(sub, now);
                    return view(sub, now);
                })
                .orElse(Status.FREE);
    }

    /** Cancela los próximos cobros. Premium sigue hasta el fin del período ya pagado. */
    @Transactional
    public Status cancel(UUID deviceId) {
        Instant now = clock.instant();
        Subscription sub = subs.findFirstByDeviceIdOrderByCreatedAtDesc(deviceId)
                .filter(s -> MercadoPago.AUTHORIZED.equals(s.getStatus()) || MercadoPago.PAUSED.equals(s.getStatus()))
                .orElseThrow(() -> ApiException.notFound("NO_SUBSCRIPTION", "No hay una suscripción activa para cancelar"));
        sub.apply(mp.cancel(sub.getMpPreapprovalId()), now);
        return view(sub, now);
    }

    /**
     * Aviso de Mercado Pago (webhook): solo trae el id. Volvemos a pedir la suscripción a Mercado Pago
     * con nuestro token, así un aviso falso no puede activar nada.
     */
    @Transactional
    public void onNotification(String preapprovalId) {
        if (preapprovalId == null || preapprovalId.isBlank() || !props.enabled()) return;
        Instant now = clock.instant();
        Optional<Subscription> known = subs.findByMpPreapprovalId(preapprovalId);
        if (known.isPresent()) {
            refreshQuietly(known.get(), now);
            return;
        }
        try {
            MercadoPago.Preapproval p = mp.get(preapprovalId);
            parseUuid(p.externalReference()).flatMap(subs::findById).ifPresent(sub -> sub.apply(p, now));
        } catch (ApiException e) {
            // id desconocido o Mercado Pago caído: lo ignoramos (si era real, Mercado Pago reintenta)
            log.info("Aviso de Mercado Pago ignorado: {}", e.getCode()); // el id viene de afuera: no lo escribimos en el log
        }
    }

    private void refreshQuietly(Subscription sub, Instant now) {
        if (sub.getMpPreapprovalId() == null || !props.enabled()) return;
        try {
            sub.apply(mp.get(sub.getMpPreapprovalId()), now);
        } catch (ApiException e) {
            log.warn("No se pudo actualizar la suscripción {}: {}", sub.getId(), e.getMessage()); // usamos la copia guardada
        }
    }

    private static Status view(Subscription sub, Instant now) {
        return new Status(sub.grantsPremium(now) ? "premium" : "free", sub.getStatus(), sub.getPeriod(),
                sub.getNextPaymentAt(), sub.getAmountArs());
    }

    private static Optional<UUID> parseUuid(String s) {
        try {
            return Optional.ofNullable(s).map(UUID::fromString);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
