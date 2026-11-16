-- Flyway ejecuta este archivo una sola vez y anota que ya lo corrió.
-- Para cambiar el esquema más adelante se agrega V2__..., nunca se edita este.

-- Cada teléfono que usa el modo pareja. No guardamos nombre, email ni nada personal.
CREATE TABLE devices (
    id          UUID PRIMARY KEY,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,      -- SHA-256 del token: si roban la base, no sirve para entrar
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);

-- El vínculo entre ella (owner) y él (partner).
CREATE TABLE pairs (
    id                 UUID PRIMARY KEY,
    owner_device_id    UUID NOT NULL UNIQUE REFERENCES devices (id),
    partner_device_id  UUID UNIQUE REFERENCES devices (id),
    invite_code        VARCHAR(9) UNIQUE,           -- se borra al usarse (un solo uso)
    invite_expires_at  TIMESTAMP WITH TIME ZONE,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    joined_at          TIMESTAMP WITH TIME ZONE
);

-- Lo que ella comparte. El servidor NO puede leerlo: está cifrado en su teléfono (AES-GCM).
CREATE TABLE snapshots (
    pair_id     UUID PRIMARY KEY REFERENCES pairs (id) ON DELETE CASCADE,
    ciphertext  TEXT NOT NULL,                      -- base64
    iv          VARCHAR(32) NOT NULL,               -- base64 del vector de inicialización
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Momentos de ella y respuestas de él, también cifrados.
CREATE TABLE messages (
    id                UUID PRIMARY KEY,
    pair_id           UUID NOT NULL REFERENCES pairs (id) ON DELETE CASCADE,
    sender_device_id  UUID NOT NULL REFERENCES devices (id),
    ciphertext        TEXT NOT NULL,
    iv                VARCHAR(32) NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_messages_pair_created ON messages (pair_id, created_at);
