package com.mydays.push;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.SecureRandom;
import java.security.interfaces.ECPublicKey;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Cifrado del contenido de una notificación push según RFC 8291 (Message Encryption for Web Push)
 * con el formato "aes128gcm" de RFC 8188. Solo el teléfono destinatario puede descifrarlo.
 *
 * Pasos:
 *  1. ECDH entre una clave efímera nuestra y la clave pública del teléfono (p256dh).
 *  2. HKDF con el secreto "auth" del teléfono → material de clave (IKM).
 *  3. HKDF con un "salt" aleatorio → clave AES de 16 bytes (CEK) y nonce de 12 bytes.
 *  4. AES-128-GCM sobre el texto + delimitador 0x02.
 *  5. Encabezado: salt(16) | tamaño de registro(4) | largo de keyid(1) | keyid = nuestra clave pública(65).
 */
public final class WebPushCrypto {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int RECORD_SIZE = 4096;

    private WebPushCrypto() { }

    public static byte[] encrypt(byte[] uaPublic, byte[] authSecret, byte[] plaintext) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        return encrypt(uaPublic, authSecret, plaintext, EcKeys.generate(), salt);
    }

    /** Versión determinística (clave efímera y salt dados) para los tests. */
    static byte[] encrypt(byte[] uaPublic, byte[] authSecret, byte[] plaintext, KeyPair asKeys, byte[] salt) {
        if (plaintext.length > RECORD_SIZE - 17 - 86) throw new IllegalArgumentException("Contenido demasiado grande para una notificación");
        try {
            byte[] asPublic = EcKeys.encodePublic((ECPublicKey) asKeys.getPublic());

            KeyAgreement ka = KeyAgreement.getInstance("ECDH");
            ka.init(asKeys.getPrivate());
            ka.doPhase(EcKeys.decodePublic(uaPublic), true);
            byte[] ecdhSecret = ka.generateSecret();

            byte[] keyInfo = concat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), uaPublic, asPublic);
            byte[] ikm = hkdf(authSecret, ecdhSecret, keyInfo, 32);
            byte[] cek = hkdf(salt, ikm, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
            byte[] nonce = hkdf(salt, ikm, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);

            Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
            aes.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
            byte[] cipher = aes.doFinal(concat(plaintext, new byte[] {0x02})); // 0x02 = último registro

            ByteBuffer header = ByteBuffer.allocate(16 + 4 + 1 + asPublic.length);
            header.put(salt).putInt(RECORD_SIZE).put((byte) asPublic.length).put(asPublic);
            return concat(header.array(), cipher);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo cifrar la notificación", e);
        }
    }

    /** HKDF-SHA256 (RFC 5869) para longitudes ≤ 32 bytes (un solo bloque). */
    static byte[] hkdf(byte[] salt, byte[] ikm, byte[] info, int length) throws GeneralSecurityException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(salt, "HmacSHA256"));
        byte[] prk = mac.doFinal(ikm);
        mac.init(new SecretKeySpec(prk, "HmacSHA256"));
        mac.update(info);
        mac.update((byte) 0x01);
        return Arrays.copyOf(mac.doFinal(), length);
    }

    static byte[] concat(byte[]... parts) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        for (byte[] p : parts) out.writeBytes(p);
        return out.toByteArray();
    }
}
