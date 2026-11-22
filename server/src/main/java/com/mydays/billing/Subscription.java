package com.mydays.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Una suscripción a Premium de un teléfono. El estado real lo tiene Mercado Pago; acá guardamos una copia. */
@Entity
@Table(name = "subscriptions")
public class Subscription {
    @Id
    private UUID id;

    @Column(name = "device_id", nullable = false)
    private UUID deviceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_period", nullable = false)
    private BillingPeriod period;

    @Column(name = "amount_ars", nullable = false)
    private BigDecimal amountArs;

    @Column(name = "mp_preapproval_id")
    private String mpPreapprovalId;

    @Column(nullable = false)
    private String status;

    @Column(name = "next_payment_at")
    private Instant nextPaymentAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Subscription() { }

    public Subscription(UUID id, UUID deviceId, BillingPeriod period, BigDecimal amountArs, Instant now) {
        this.id = id;
        this.deviceId = deviceId;
        this.period = period;
        this.amountArs = amountArs;
        this.status = MercadoPago.PENDING;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Copia el estado que devolvió Mercado Pago. */
    void apply(MercadoPago.Preapproval p, Instant now) {
        this.mpPreapprovalId = p.id();
        this.status = p.status();
        if (p.nextPaymentAt() != null) this.nextPaymentAt = p.nextPaymentAt();
        this.updatedAt = now;
    }

    /**
     * ¿Tiene Premium? Sí mientras la suscripción esté activa, y si la canceló, hasta el final del período que ya pagó.
     */
    public boolean grantsPremium(Instant now) {
        if (MercadoPago.AUTHORIZED.equals(status)) return true;
        return MercadoPago.CANCELLED.equals(status) && nextPaymentAt != null && now.isBefore(nextPaymentAt);
    }

    public UUID getId() { return id; }
    public UUID getDeviceId() { return deviceId; }
    public BillingPeriod getPeriod() { return period; }
    public BigDecimal getAmountArs() { return amountArs; }
    public String getMpPreapprovalId() { return mpPreapprovalId; }
    public String getStatus() { return status; }
    public Instant getNextPaymentAt() { return nextPaymentAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
