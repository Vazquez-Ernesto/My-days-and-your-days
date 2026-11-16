package com.mydays.pair;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Vínculo entre ella (owner, lleva su ciclo) y él (partner). */
@Entity
@Table(name = "pairs")
public class Pair {
    @Id
    private UUID id;

    @Column(name = "owner_device_id", nullable = false, unique = true)
    private UUID ownerDeviceId;

    @Column(name = "partner_device_id", unique = true)
    private UUID partnerDeviceId;

    @Column(name = "invite_code", unique = true, length = 9)
    private String inviteCode;

    @Column(name = "invite_expires_at")
    private Instant inviteExpiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "joined_at")
    private Instant joinedAt;

    protected Pair() { }

    public Pair(UUID id, UUID ownerDeviceId, Instant createdAt) {
        this.id = id;
        this.ownerDeviceId = ownerDeviceId;
        this.createdAt = createdAt;
    }

    // --- reglas del dominio: viven en la entidad, no desparramadas en el código ---

    public boolean isActive() { return partnerDeviceId != null; }

    public boolean isMember(UUID deviceId) {
        return ownerDeviceId.equals(deviceId) || deviceId.equals(partnerDeviceId);
    }

    public boolean isOwner(UUID deviceId) { return ownerDeviceId.equals(deviceId); }

    public boolean isInviteExpired(Instant now) {
        return inviteExpiresAt == null || !now.isBefore(inviteExpiresAt);
    }

    public void newInvite(String code, Instant expiresAt) {
        this.inviteCode = code;
        this.inviteExpiresAt = expiresAt;
    }

    /** Él acepta: la invitación se consume (un solo uso). */
    public void join(UUID partnerDeviceId, Instant now) {
        this.partnerDeviceId = partnerDeviceId;
        this.joinedAt = now;
        this.inviteCode = null;
        this.inviteExpiresAt = null;
    }

    public UUID getId() { return id; }
    public UUID getOwnerDeviceId() { return ownerDeviceId; }
    public UUID getPartnerDeviceId() { return partnerDeviceId; }
    public String getInviteCode() { return inviteCode; }
    public Instant getInviteExpiresAt() { return inviteExpiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getJoinedAt() { return joinedAt; }
}
