package com.mydays.push;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.time.Instant;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class WebPushCryptoTest {

    /** Hace de "teléfono": descifra como lo haría el navegador (RFC 8291), con su clave privada. */
    static byte[] decryptAsUserAgent(byte[] body, KeyPair ua, byte[] auth) throws Exception {
        ByteBuffer buf = ByteBuffer.wrap(body);
        byte[] salt = new byte[16];
        buf.get(salt);
        int rs = buf.getInt();
        byte[] asPublic = new byte[buf.get()];
        buf.get(asPublic);
        byte[] cipher = Arrays.copyOfRange(body, buf.position(), body.length);
        assertThat(rs).isEqualTo(4096);

        KeyAgreement ka = KeyAgreement.getInstance("ECDH");
        ka.init(ua.getPrivate());
        ka.doPhase(EcKeys.decodePublic(asPublic), true);
        byte[] uaPublic = EcKeys.encodePublic((ECPublicKey) ua.getPublic());
        byte[] ikm = WebPushCrypto.hkdf(auth, ka.generateSecret(),
                WebPushCrypto.concat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), uaPublic, asPublic), 32);
        byte[] cek = WebPushCrypto.hkdf(salt, ikm, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
        byte[] nonce = WebPushCrypto.hkdf(salt, ikm, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);
        Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
        aes.init(Cipher.DECRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
        byte[] padded = aes.doFinal(cipher);
        assertThat(padded[padded.length - 1]).isEqualTo((byte) 0x02);
        return Arrays.copyOf(padded, padded.length - 1);
    }

    @Test
    void elTelefonoPuedeDescifrarLaNotificacion() throws Exception {
        KeyPair ua = EcKeys.generate();
        byte[] auth = new byte[16];
        new java.security.SecureRandom().nextBytes(auth);
        byte[] uaPublic = EcKeys.encodePublic((ECPublicKey) ua.getPublic());
        String json = "{\"type\":\"test\",\"texto\":\"¡Hola! 💞\"}";

        byte[] body = WebPushCrypto.encrypt(uaPublic, auth, json.getBytes(StandardCharsets.UTF_8));

        assertThat(new String(decryptAsUserAgent(body, ua, auth), StandardCharsets.UTF_8)).isEqualTo(json);
        assertThat(new String(body, StandardCharsets.ISO_8859_1)).doesNotContain("Hola");

        // Vector para la verificación cruzada con Node (http_ece), solo si se pide
        String out = System.getProperty("webpush.vector");
        if (out != null) {
            byte[] d = ((ECPrivateKey) ua.getPrivate()).getS().toByteArray();
            byte[] priv = new byte[32];
            System.arraycopy(d, Math.max(0, d.length - 32), priv, 32 - Math.min(32, d.length), Math.min(32, d.length));
            Files.writeString(Path.of(out), "{\"uaPrivate\":\"" + EcKeys.b64url(priv) + "\",\"uaPublic\":\"" + EcKeys.b64url(uaPublic)
                    + "\",\"auth\":\"" + EcKeys.b64url(auth) + "\",\"body\":\"" + EcKeys.b64url(body) + "\",\"expected\":" + jsonString(json) + "}");
        }
    }

    @Test
    void conOtroTelefonoNoSePuedeDescifrar() throws Exception {
        KeyPair ua = EcKeys.generate();
        KeyPair otro = EcKeys.generate();
        byte[] auth = new byte[16];
        byte[] body = WebPushCrypto.encrypt(EcKeys.encodePublic((ECPublicKey) ua.getPublic()), auth, "secreto".getBytes());
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> decryptAsUserAgent(body, otro, auth))
                .isInstanceOf(javax.crypto.AEADBadTagException.class);
    }

    @Test
    void codificarYDecodificarClavesPublicas() {
        ECPublicKey key = (ECPublicKey) EcKeys.generate().getPublic();
        byte[] encoded = EcKeys.encodePublic(key);
        assertThat(encoded).hasSize(65).startsWith((byte) 0x04);
        assertThat(EcKeys.decodePublic(encoded).getW()).isEqualTo(key.getW());
    }

    @Test
    void elJwtVapidEsValidoYVerificable() throws Exception {
        KeyPair vapid = EcKeys.generate();
        String jwt = VapidJwt.create("https://web.push.apple.com", "https://example.org/", Instant.parse("2026-11-16T13:00:00Z"), vapid.getPrivate());
        String[] parts = jwt.split("\\.");
        assertThat(parts).hasSize(3);
        assertThat(new String(EcKeys.fromB64(parts[1]), StandardCharsets.UTF_8))
                .isEqualTo("{\"aud\":\"https://web.push.apple.com\",\"exp\":1794834000,\"sub\":\"https://example.org/\"}");
        Signature verify = Signature.getInstance("SHA256withECDSAinP1363Format");
        verify.initVerify(vapid.getPublic());
        verify.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
        assertThat(verify.verify(EcKeys.fromB64(parts[2]))).isTrue();

        String out = System.getProperty("webpush.jwt");
        if (out != null) {
            Files.writeString(Path.of(out), "{\"jwt\":\"" + jwt + "\",\"publicKey\":\""
                    + EcKeys.b64url(EcKeys.encodePublic((ECPublicKey) vapid.getPublic())) + "\"}");
        }
    }

    @Test
    void laAudienciaEsElOrigenDelEndpoint() {
        assertThat(VapidJwt.audienceOf("https://web.push.apple.com/QGv2x9Abc")).isEqualTo("https://web.push.apple.com");
        assertThat(VapidJwt.audienceOf("https://fcm.googleapis.com/fcm/send/abc:123")).isEqualTo("https://fcm.googleapis.com");
    }

    private static String jsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
