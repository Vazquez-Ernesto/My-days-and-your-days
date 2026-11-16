package com.mydays.pair;

import com.mydays.common.ApiException;
import com.mydays.push.PushEvents;
import org.springframework.context.ApplicationEventPublisher;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reglas de la vinculación:
 * - Ella crea una invitación (vence en 24 h, se puede regenerar mientras nadie la usó).
 * - Él la acepta una sola vez. No puede aceptar su propia invitación ni estar en dos vínculos.
 * - Cualquiera de los dos puede desvincular: se borra todo lo compartido.
 */
@Service
public class PairService {
    private final PairRepository pairs;
    private final Clock clock;
    private final Duration inviteTtl;
    private final ApplicationEventPublisher events;

    public PairService(PairRepository pairs, Clock clock, @Value("${app.invite-ttl}") Duration inviteTtl,
                       ApplicationEventPublisher events) {
        this.pairs = pairs;
        this.clock = clock;
        this.inviteTtl = inviteTtl;
        this.events = events;
    }

    @Transactional
    public PairView createInvite(UUID ownerId) {
        Instant now = Instant.now(clock);
        Pair pair = pairs.findByMember(ownerId).orElse(null);
        if (pair != null && !pair.isOwner(ownerId)) {
            throw ApiException.conflict("ALREADY_PAIRED", "Este teléfono ya está vinculado como pareja");
        }
        if (pair != null && pair.isActive()) {
            throw ApiException.conflict("ALREADY_PAIRED", "Ya tenés una pareja vinculada. Desvinculala para invitar a otra persona");
        }
        if (pair == null) pair = new Pair(UUID.randomUUID(), ownerId, now);
        pair.newInvite(uniqueCode(), now.plus(inviteTtl));
        return PairView.of(pairs.save(pair), ownerId);
    }

    @Transactional
    public PairView join(UUID partnerId, String rawCode) {
        String code = InviteCodes.normalize(rawCode);
        if (code == null) throw ApiException.notFound("INVITE_NOT_FOUND", "El código no tiene el formato XXXX-XXXX");
        Pair pair = pairs.findByInviteCode(code)
                .orElseThrow(() -> ApiException.notFound("INVITE_NOT_FOUND", "No encontramos esa invitación. Revisá el código"));
        Instant now = Instant.now(clock);
        if (pair.isInviteExpired(now)) {
            throw ApiException.gone("INVITE_EXPIRED", "La invitación venció. Pedile que genere una nueva");
        }
        if (pair.isOwner(partnerId)) {
            throw ApiException.conflict("CANNOT_JOIN_OWN_INVITE", "No podés aceptar tu propia invitación");
        }
        if (pairs.findByMember(partnerId).isPresent()) {
            throw ApiException.conflict("ALREADY_PAIRED", "Este teléfono ya está en otro vínculo. Desvinculalo primero");
        }
        pair.join(partnerId, now);
        Pair saved = pairs.save(pair);
        events.publishEvent(new PushEvents.PairJoined(saved.getOwnerDeviceId())); // → "Tu pareja aceptó 💞"
        return PairView.of(saved, partnerId);
    }

    @Transactional(readOnly = true)
    public PairView myPair(UUID deviceId) {
        return pairs.findByMember(deviceId).map(p -> PairView.of(p, deviceId))
                .orElseThrow(() -> ApiException.notFound("NO_PAIR", "Este teléfono no está vinculado"));
    }

    @Transactional
    public void unlink(UUID deviceId, UUID pairId) {
        pairs.delete(requireMember(deviceId, pairId)); // ON DELETE CASCADE borra snapshot y mensajes
    }

    /** Usado también por el sync: valida que el dispositivo pertenezca al vínculo. */
    @Transactional(readOnly = true)
    public Pair requireMember(UUID deviceId, UUID pairId) {
        Pair pair = pairs.findById(pairId)
                .orElseThrow(() -> ApiException.notFound("PAIR_NOT_FOUND", "El vínculo no existe"));
        if (!pair.isMember(deviceId)) {
            throw ApiException.forbidden("NOT_A_MEMBER", "No formás parte de este vínculo");
        }
        return pair;
    }

    private String uniqueCode() {
        for (int i = 0; i < 5; i++) {
            String code = InviteCodes.generate();
            if (pairs.findByInviteCode(code).isEmpty()) return code;
        }
        throw new IllegalStateException("No se pudo generar un código único");
    }
}
