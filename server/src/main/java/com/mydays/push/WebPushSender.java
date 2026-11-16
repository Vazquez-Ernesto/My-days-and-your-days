package com.mydays.push;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Envío real por HTTP al servicio de push del teléfono (Apple, Google, Mozilla o Microsoft). */
@Component
public class WebPushSender implements PushSender {
    private static final Logger log = LoggerFactory.getLogger(WebPushSender.class);
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final VapidKeyService vapid;
    private final Clock clock;
    private final String subject;

    public WebPushSender(VapidKeyService vapid, Clock clock, @Value("${app.push.subject}") String subject) {
        this.vapid = vapid;
        this.clock = clock;
        this.subject = subject;
    }

    @Override
    public Result send(PushSubscription sub, String payloadJson, boolean urgent) {
        VapidKeyService.Keys keys = vapid.keys();
        byte[] body = WebPushCrypto.encrypt(EcKeys.fromB64(sub.getP256dh()), EcKeys.fromB64(sub.getAuth()),
                payloadJson.getBytes(StandardCharsets.UTF_8));
        String jwt = VapidJwt.create(VapidJwt.audienceOf(sub.getEndpoint()), subject, Instant.now(clock).plus(Duration.ofHours(1)), keys.privateKey());
        HttpRequest req = HttpRequest.newBuilder(URI.create(sub.getEndpoint()))
                .timeout(Duration.ofSeconds(15))
                .header("TTL", "86400")
                .header("Urgency", urgent ? "high" : "normal")
                .header("Content-Encoding", "aes128gcm")
                .header("Content-Type", "application/octet-stream")
                .header("Authorization", "vapid t=" + jwt + ", k=" + keys.publicKeyB64Url())
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();
        try {
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            int code = res.statusCode();
            if (code >= 200 && code < 300) return Result.DELIVERED;
            if (code == 404 || code == 410) return Result.GONE; // el teléfono ya no usa esa suscripción
            log.warn("El servicio de push respondió {}: {}", code, res.body());
            return Result.FAILED;
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.warn("No se pudo enviar la notificación: {}", e.toString());
            return Result.FAILED;
        }
    }
}
