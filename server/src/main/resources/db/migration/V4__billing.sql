-- Suscripciones a Premium cobradas con Mercado Pago (preapproval = débito automático).
-- No guardamos datos de la tarjeta ni el email: los tiene Mercado Pago.
CREATE TABLE subscriptions (
    id                 UUID PRIMARY KEY,
    device_id          UUID NOT NULL REFERENCES devices (id) ON DELETE CASCADE,
    billing_period     VARCHAR(16) NOT NULL,          -- MONTHLY | YEARLY
    amount_ars         NUMERIC(12, 2) NOT NULL,       -- lo que se cobra por período, en pesos
    mp_preapproval_id  VARCHAR(64) UNIQUE,            -- id de la suscripción en Mercado Pago
    status             VARCHAR(16) NOT NULL,          -- pending | authorized | paused | cancelled
    next_payment_at    TIMESTAMP WITH TIME ZONE,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX subscriptions_device ON subscriptions (device_id, created_at DESC);
