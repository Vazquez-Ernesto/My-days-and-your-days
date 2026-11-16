package com.mydays.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Lo que ella comparte, cifrado. Una sola fila por vínculo: cada subida reemplaza la anterior. */
@Entity
@Table(name = "snapshots")
public class Snapshot {
    @Id
    @Column(name = "pair_id")
    private UUID pairId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String ciphertext;

    @Column(nullable = false, length = 32)
    private String iv;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Snapshot() { }

    public Snapshot(UUID pairId) {
        this.pairId = pairId;
    }

    public void update(String ciphertext, String iv, Instant now) {
        this.ciphertext = ciphertext;
        this.iv = iv;
        this.updatedAt = now;
    }

    public UUID getPairId() { return pairId; }
    public String getCiphertext() { return ciphertext; }
    public String getIv() { return iv; }
    public Instant getUpdatedAt() { return updatedAt; }
}
