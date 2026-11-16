package com.mydays.push;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "push_subscriptions")
public class PushSubscription {
    @Id
    @Column(name = "device_id")
    private UUID deviceId;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String endpoint;
    @Column(nullable = false, length = 128)
    private String p256dh;
    @Column(nullable = false, length = 64)
    private String auth;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PushSubscription() { }

    public PushSubscription(UUID deviceId, String endpoint, String p256dh, String auth, Instant createdAt) {
        this.deviceId = deviceId;
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
        this.createdAt = createdAt;
    }

    public UUID getDeviceId() { return deviceId; }
    public String getEndpoint() { return endpoint; }
    public String getP256dh() { return p256dh; }
    public String getAuth() { return auth; }
}
