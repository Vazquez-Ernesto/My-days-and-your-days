package com.mydays.sync;

import com.mydays.common.ApiException;
import com.mydays.pair.Pair;
import com.mydays.pair.PairService;
import com.mydays.push.PushEvents;
import org.springframework.context.ApplicationEventPublisher;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SyncService {
    static final int MAX_MESSAGE_LENGTH = 8_000;
    static final int MESSAGES_PAGE = 100;

    private final PairService pairs;
    private final SnapshotRepository snapshots;
    private final MessageRepository messages;
    private final ProfileRepository profiles;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    public SyncService(PairService pairs, SnapshotRepository snapshots, MessageRepository messages, ProfileRepository profiles,
                       Clock clock, ApplicationEventPublisher events) {
        this.pairs = pairs;
        this.snapshots = snapshots;
        this.messages = messages;
        this.profiles = profiles;
        this.clock = clock;
        this.events = events;
    }

    /** Solo ella sube su snapshot. */
    @Transactional
    public SnapshotView putSnapshot(UUID deviceId, UUID pairId, EncryptedPayload body) {
        Pair pair = pairs.requireMember(deviceId, pairId);
        if (!pair.isOwner(deviceId)) {
            throw ApiException.forbidden("OWNER_ONLY", "Solo quien lleva su ciclo puede compartir sus datos");
        }
        Snapshot snap = snapshots.findById(pairId).orElseGet(() -> new Snapshot(pairId));
        snap.update(body.ciphertext(), body.iv(), Instant.now(clock));
        return SnapshotView.of(snapshots.save(snap));
    }

    /** Los dos pueden leerlo (ella, para verificar lo que subió). */
    @Transactional(readOnly = true)
    public SnapshotView getSnapshot(UUID deviceId, UUID pairId) {
        pairs.requireMember(deviceId, pairId);
        return snapshots.findById(pairId).map(SnapshotView::of)
                .orElseThrow(() -> ApiException.notFound("NO_SNAPSHOT", "Todavía no compartió nada"));
    }

    @Transactional
    public MessageView postMessage(UUID deviceId, UUID pairId, EncryptedPayload body) {
        Pair pair = pairs.requireMember(deviceId, pairId);
        if (!pair.isActive()) {
            throw ApiException.conflict("PAIR_NOT_ACTIVE", "La invitación todavía no fue aceptada");
        }
        if (body.ciphertext().length() > MAX_MESSAGE_LENGTH) {
            throw new ApiException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE, "MESSAGE_TOO_LARGE", "El mensaje es demasiado grande");
        }
        Message m = messages.save(new Message(UUID.randomUUID(), pairId, deviceId, body.ciphertext(), body.iv(), Instant.now(clock)));
        UUID recipient = pair.isOwner(deviceId) ? pair.getPartnerDeviceId() : pair.getOwnerDeviceId();
        events.publishEvent(new PushEvents.MessagePosted(recipient, body.ciphertext(), body.iv())); // → notificación al otro
        return MessageView.of(m, deviceId);
    }

    /** Mensajes posteriores a `since` (para pedir solo lo nuevo), de a 100. */
    @Transactional(readOnly = true)
    public List<MessageView> getMessages(UUID deviceId, UUID pairId, Instant since) {
        pairs.requireMember(deviceId, pairId);
        Instant after = since != null ? since : Instant.EPOCH;
        return messages.findByPairIdAndCreatedAtAfterOrderByCreatedAtAsc(pairId, after, Limit.of(MESSAGES_PAGE))
                .stream().map(m -> MessageView.of(m, deviceId)).toList();
    }

    static final int MAX_PROFILE_LENGTH = 200_000;

    /** Cada integrante sube su propio perfil (foto + nombre, cifrados). No genera notificaciones. */
    @Transactional
    public ProfileView putProfile(UUID deviceId, UUID pairId, EncryptedPayload body) {
        pairs.requireMember(deviceId, pairId);
        if (body.ciphertext().length() > MAX_PROFILE_LENGTH) {
            throw new ApiException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE, "PROFILE_TOO_LARGE", "La foto es demasiado grande");
        }
        Profile.Key key = new Profile.Key(pairId, deviceId);
        Profile p = profiles.findById(key).orElseGet(() -> new Profile(key));
        p.update(body.ciphertext(), body.iv(), Instant.now(clock));
        return ProfileView.of(profiles.save(p), deviceId);
    }

    /** Perfiles del vínculo actualizados después de `since` (para no bajar las fotos en cada sincronización). */
    @Transactional(readOnly = true)
    public List<ProfileView> getProfiles(UUID deviceId, UUID pairId, Instant since) {
        pairs.requireMember(deviceId, pairId);
        return profiles.findByIdPairIdAndUpdatedAtAfter(pairId, since != null ? since : Instant.EPOCH)
                .stream().map(p -> ProfileView.of(p, deviceId)).toList();
    }

    public record ProfileView(boolean mine, String ciphertext, String iv, Instant updatedAt) {
        static ProfileView of(Profile p, UUID viewer) {
            return new ProfileView(p.getId().deviceId().equals(viewer), p.getCiphertext(), p.getIv(), p.getUpdatedAt());
        }
    }

    public record SnapshotView(String ciphertext, String iv, Instant updatedAt) {
        static SnapshotView of(Snapshot s) { return new SnapshotView(s.getCiphertext(), s.getIv(), s.getUpdatedAt()); }
    }

    public record MessageView(UUID id, boolean fromMe, String ciphertext, String iv, Instant createdAt) {
        static MessageView of(Message m, UUID viewer) {
            return new MessageView(m.getId(), m.getSenderDeviceId().equals(viewer), m.getCiphertext(), m.getIv(), m.getCreatedAt());
        }
    }
}
