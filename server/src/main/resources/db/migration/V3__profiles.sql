-- Perfil de cada integrante del vínculo (foto y nombre), CIFRADO en el teléfono.
CREATE TABLE pair_profiles (
    pair_id     UUID NOT NULL REFERENCES pairs (id) ON DELETE CASCADE,
    device_id   UUID NOT NULL REFERENCES devices (id) ON DELETE CASCADE,
    ciphertext  TEXT NOT NULL,
    iv          VARCHAR(32) NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (pair_id, device_id)
);
