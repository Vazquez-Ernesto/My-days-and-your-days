package com.mydays.push;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.PrivateKey;
import java.security.Signature;
import java.time.Instant;

/**
 * Firma VAPID (RFC 8292): un JWT firmado con ES256 que demuestra al servicio de push
 * (Apple, Google, Mozilla) que la notificación la manda nuestro servidor.
 */
public final class VapidJwt {
    private VapidJwt() { }

    /** "https://web.push.apple.com/abc..." → "https://web.push.apple.com" */
    public static String audienceOf(String endpoint) {
        URI u = URI.create(endpoint);
        return u.getScheme() + "://" + u.getHost() + (u.getPort() == -1 ? "" : ":" + u.getPort());
    }

    public static String create(String audience, String subject, Instant expiresAt, PrivateKey key) {
        String header = EcKeys.b64url("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.UTF_8));
        String claims = EcKeys.b64url(("{\"aud\":\"" + audience + "\",\"exp\":" + expiresAt.getEpochSecond()
                + ",\"sub\":\"" + subject + "\"}").getBytes(StandardCharsets.UTF_8));
        String unsigned = header + "." + claims;
        try {
            // "inP1363Format" = firma de 64 bytes (r || s), que es lo que pide JWT (no el formato DER de Java)
            Signature sig = Signature.getInstance("SHA256withECDSAinP1363Format");
            sig.initSign(key);
            sig.update(unsigned.getBytes(StandardCharsets.US_ASCII));
            return unsigned + "." + EcKeys.b64url(sig.sign());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo firmar el JWT VAPID", e);
        }
    }
}
