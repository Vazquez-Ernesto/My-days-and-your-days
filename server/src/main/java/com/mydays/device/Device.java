package com.mydays.device;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Entidad JPA: cada objeto Device es una fila de la tabla "devices". */
@Entity
@Table(name = "devices")
public class Device {
    @Id
    private UUID id;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Device() { } // JPA necesita un constructor vacío

    public Device(UUID id, String tokenHash, Instant createdAt) {
        this.id = id;
        this.tokenHash = tokenHash;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public String getTokenHash() { return tokenHash; }
    public Instant getCreatedAt() { return createdAt; }
}
