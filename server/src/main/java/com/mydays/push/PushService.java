package com.mydays.push;

import com.mydays.common.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
public class PushService {
    private static final Logger log = LoggerFactory.getLogger(PushService.class);
    static final int MAX_SCHEDULE = 120;
    static final Duration MAX_AHEAD = Duration.ofDays(15);
    static final Duration MAX_LATE = Duration.ofHours(3);   // si el servidor estuvo dormido más que esto, el aviso ya no sirve
    static final int MAX_INLINE_CIPHERTEXT = 3000;          // las notificaciones admiten ~4 KB

    private final PushSubscriptionRepository subscriptions;
    private final ScheduledPushRepository scheduled;
    private final PushSender sender;
    private final Clock clock;

    public PushService(PushSubscriptionRepository subscriptions, ScheduledPushRepository scheduled, PushSender sender, Clock clock) {
        this.subscriptions = subscriptions;
        this.scheduled = scheduled;
        this.sender = sender;
        this.clock = clock;
    }

    // ---------- suscripción ----------

    @Transactional
    public void subscribe(UUID deviceId, String endpoint, String p256dh, String auth) {
        if (!PushEndpoints.isAllowed(endpoint)) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "PUSH_ENDPOINT_NOT_ALLOWED", "Servicio de notificaciones no reconocido");
        }
        try {
            EcKeys.decodePublic(EcKeys.fromB64(p256dh));
            if (EcKeys.fromB64(auth).length != 16) throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "PUSH_KEYS_INVALID", "Las claves de la suscripción no son válidas");
        }
        subscriptions.save(new PushSubscription(deviceId, endpoint, p256dh, auth, Instant.now(clock)));
    }

    @Transactional
    public void unsubscribe(UUID deviceId) {
        subscriptions.deleteById(deviceId);
        scheduled.deleteByDeviceId(deviceId);
    }

    // ---------- recordatorios programados ----------

    public record Item(Instant sendAt, String ciphertext, String iv) { }

    /** Reemplaza TODOS los recordatorios futuros del teléfono (la app manda siempre la lista completa). */
    @Transactional
    public int replaceSchedule(UUID deviceId, List<Item> items) {
        if (items.size() > MAX_SCHEDULE) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "SCHEDULE_TOO_LARGE", "Demasiados recordatorios");
        }
        Instant now = Instant.now(clock);
        scheduled.deleteByDeviceId(deviceId);
        int saved = 0;
        for (Item i : items) {
            if (i.sendAt().isBefore(now.minus(Duration.ofMinutes(5))) || i.sendAt().isAfter(now.plus(MAX_AHEAD))) continue;
            scheduled.save(new ScheduledPush(UUID.randomUUID(), deviceId, i.sendAt(), i.ciphertext(), i.iv()));
            saved++;
        }
        return saved;
    }

    /** Lo llama el programador cada 30 s: envía los recordatorios que ya llegaron a su hora. */
    @Transactional
    public int sendDue() {
        Instant now = Instant.now(clock);
        List<ScheduledPush> due = scheduled.findBySendAtLessThanEqualOrderBySendAtAsc(now, Limit.of(200));
        int sent = 0;
        for (ScheduledPush p : due) {
            scheduled.delete(p);
            if (p.getSendAt().isBefore(now.minus(MAX_LATE))) continue;
            String payload = "{\"type\":\"reminder\",\"key\":\"self\",\"ciphertext\":\"" + p.getCiphertext() + "\",\"iv\":\"" + p.getIv() + "\"}";
            if (deliver(p.getDeviceId(), payload, false) == PushSender.Result.DELIVERED) sent++;
        }
        return sent;
    }

    // ---------- avisos inmediatos (eventos de otros módulos) ----------

    /** Se ejecuta DESPUÉS de que se guardó la vinculación, en otro hilo (no demora la respuesta). */
    @Async
    @TransactionalEventListener
    public void onPairJoined(PushEvents.PairJoined e) {
        deliver(e.ownerDeviceId(), "{\"type\":\"joined\"}", true);
    }

    @Async
    @TransactionalEventListener
    public void onMessagePosted(PushEvents.MessagePosted e) {
        String payload = e.ciphertext().length() <= MAX_INLINE_CIPHERTEXT
                ? "{\"type\":\"message\",\"key\":\"pair\",\"ciphertext\":\"" + e.ciphertext() + "\",\"iv\":\"" + e.iv() + "\"}"
                : "{\"type\":\"message\"}";
        deliver(e.recipientDeviceId(), payload, true);
    }

    /** Notificación de prueba (botón "Probar" en la app). */
    public PushSender.Result sendTest(UUID deviceId) {
        if (!subscriptions.existsById(deviceId)) {
            throw ApiException.conflict("NO_PUSH_SUBSCRIPTION", "Este teléfono no tiene las notificaciones activadas");
        }
        return deliver(deviceId, "{\"type\":\"test\"}", true);
    }

    @Transactional(readOnly = true)
    public List<ScheduledPush> scheduleOf(UUID deviceId) {
        return scheduled.findByDeviceIdOrderBySendAtAsc(deviceId);
    }

    private PushSender.Result deliver(UUID deviceId, String payload, boolean urgent) {
        PushSubscription sub = subscriptions.findById(deviceId).orElse(null);
        if (sub == null) return PushSender.Result.FAILED;
        PushSender.Result r = sender.send(sub, payload, urgent);
        if (r == PushSender.Result.GONE) {
            log.info("Suscripción vencida, la borramos");
            subscriptions.deleteById(deviceId);
        }
        return r;
    }
}
