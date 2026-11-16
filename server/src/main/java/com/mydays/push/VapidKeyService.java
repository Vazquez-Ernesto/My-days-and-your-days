package com.mydays.push;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Claves VAPID del servidor. Se generan solas la primera vez y se guardan en la base (tabla app_settings),
 * así no hay que configurar ningún secreto a mano. Si cambiaran, los teléfonos tendrían que volver a suscribirse.
 */
@Service
public class VapidKeyService {
    private static final Logger log = LoggerFactory.getLogger(VapidKeyService.class);
    private final JdbcTemplate jdbc;
    private volatile Keys keys;

    public VapidKeyService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Keys(String publicKeyB64Url, ECPublicKey publicKey, PrivateKey privateKey) { }

    public Keys keys() {
        Keys k = keys;
        if (k == null) {
            synchronized (this) {
                if (keys == null) keys = loadOrCreate();
                k = keys;
            }
        }
        return k;
    }

    private Keys loadOrCreate() {
        try {
            List<String> stored = jdbc.queryForList("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_private_pkcs8'", String.class);
            if (stored.isEmpty()) {
                KeyPair pair = EcKeys.generate();
                jdbc.update("INSERT INTO app_settings (setting_key, setting_value) VALUES ('vapid_private_pkcs8', ?), ('vapid_public', ?)",
                        Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded()),
                        EcKeys.b64url(EcKeys.encodePublic((ECPublicKey) pair.getPublic())));
                log.info("Claves VAPID generadas y guardadas");
            }
            String priv = jdbc.queryForObject("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_private_pkcs8'", String.class);
            String pub = jdbc.queryForObject("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_public'", String.class);
            PrivateKey privateKey = KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(priv)));
            if (!(privateKey instanceof ECPrivateKey)) throw new IllegalStateException("Clave VAPID inválida");
            return new Keys(pub, EcKeys.decodePublic(EcKeys.fromB64(pub)), privateKey);
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("No se pudieron cargar las claves VAPID", e);
        }
    }
}
