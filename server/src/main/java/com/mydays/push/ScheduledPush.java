package com.mydays.push;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Un recordatorio programado. El contenido está cifrado por el teléfono: el servidor solo conoce la hora. */
@Entity
@Table(name = "scheduled_pushes")
public class ScheduledPush {
    @Id
    private UUID id;
    @Column(name = "device_id", nullable = false)
    private UUID deviceId;
    @Column(name = "send_at", nullable = false)
    private Instant sendAt;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String ciphertext;
    @Column(nullable = false, length = 32)
    private String iv;

    protected ScheduledPush() { }

    public ScheduledPush(UUID id, UUID deviceId, Instant sendAt, String ciphertext, String iv) {
        this.id = id;
        this.deviceId = deviceId;
        this.sendAt = sendAt;
        this.ciphertext = ciphertext;
        this.iv = iv;
    }

    public UUID getId() { return id; }
    public UUID getDeviceId() { return deviceId; }
    public Instant getSendAt() { return sendAt; }
    public String getCiphertext() { return ciphertext; }
    public String getIv() { return iv; }
}
