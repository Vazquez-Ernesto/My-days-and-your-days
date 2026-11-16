package com.mydays.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Un momento de ella o una respuesta de él, cifrado. */
@Entity
@Table(name = "messages")
public class Message {
    @Id
    private UUID id;

    @Column(name = "pair_id", nullable = false)
    private UUID pairId;

    @Column(name = "sender_device_id", nullable = false)
    private UUID senderDeviceId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String ciphertext;

    @Column(nullable = false, length = 32)
    private String iv;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Message() { }

    public Message(UUID id, UUID pairId, UUID senderDeviceId, String ciphertext, String iv, Instant createdAt) {
        this.id = id;
        this.pairId = pairId;
        this.senderDeviceId = senderDeviceId;
        this.ciphertext = ciphertext;
        this.iv = iv;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getPairId() { return pairId; }
    public UUID getSenderDeviceId() { return senderDeviceId; }
    public String getCiphertext() { return ciphertext; }
    public String getIv() { return iv; }
    public Instant getCreatedAt() { return createdAt; }
}
