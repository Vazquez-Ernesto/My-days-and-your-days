package com.mydays.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/** Foto y nombre de un integrante del vínculo, cifrados. Clave compuesta: (vínculo, dispositivo). */
@Entity
@Table(name = "pair_profiles")
public class Profile {

    @Embeddable
    public record Key(@Column(name = "pair_id") UUID pairId, @Column(name = "device_id") UUID deviceId) implements Serializable { }

    @EmbeddedId
    private Key id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String ciphertext;

    @Column(nullable = false, length = 32)
    private String iv;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Profile() { }

    public Profile(Key id) {
        this.id = id;
    }

    public void update(String ciphertext, String iv, Instant now) {
        this.ciphertext = ciphertext;
        this.iv = iv;
        this.updatedAt = now;
    }

    public Key getId() { return id; }
    public String getCiphertext() { return ciphertext; }
    public String getIv() { return iv; }
    public Instant getUpdatedAt() { return updatedAt; }
}
