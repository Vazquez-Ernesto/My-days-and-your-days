-- Notificaciones push (Web Push).

-- Configuración generada por el servidor (ej. las claves VAPID). Se genera una sola vez.
-- (No usamos "name"/"value" como columnas: "value" es palabra reservada en H2.)
CREATE TABLE app_settings (
    setting_key    VARCHAR(64) PRIMARY KEY,
    setting_value  TEXT NOT NULL
);

-- La "dirección" de push de cada teléfono (la da el navegador / iOS). Una por dispositivo.
CREATE TABLE push_subscriptions (
    device_id   UUID PRIMARY KEY REFERENCES devices (id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL,
    p256dh      VARCHAR(128) NOT NULL,   -- clave pública del teléfono (para cifrar la notificación)
    auth        VARCHAR(64) NOT NULL,    -- secreto compartido con el teléfono
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Recordatorios programados. El contenido viaja CIFRADO por el teléfono: el servidor solo sabe la hora.
CREATE TABLE scheduled_pushes (
    id          UUID PRIMARY KEY,
    device_id   UUID NOT NULL REFERENCES devices (id) ON DELETE CASCADE,
    send_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    ciphertext  TEXT NOT NULL,
    iv          VARCHAR(32) NOT NULL
);
CREATE INDEX idx_scheduled_pushes_send_at ON scheduled_pushes (send_at);
