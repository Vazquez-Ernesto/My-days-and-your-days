package com.mydays.pair;

import java.time.Instant;
import java.util.UUID;

/**
 * Lo que devolvemos al cliente sobre un vínculo (un "DTO"). Nunca devolvemos la entidad directo:
 * así elegimos exactamente qué campos salen (por ejemplo, él nunca ve el código de invitación).
 */
public record PairView(UUID pairId, Role role, Status status, String inviteCode, Instant inviteExpiresAt, Instant joinedAt) {

    public enum Role { OWNER, PARTNER }
    public enum Status { PENDING, ACTIVE }

    public static PairView of(Pair pair, UUID viewerDeviceId) {
        boolean owner = pair.isOwner(viewerDeviceId);
        return new PairView(
                pair.getId(),
                owner ? Role.OWNER : Role.PARTNER,
                pair.isActive() ? Status.ACTIVE : Status.PENDING,
                owner ? pair.getInviteCode() : null,
                owner ? pair.getInviteExpiresAt() : null,
                pair.getJoinedAt());
    }
}
