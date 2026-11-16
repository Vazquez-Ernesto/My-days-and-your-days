package com.mydays.push;

import java.net.URI;
import java.util.Locale;

/**
 * Solo aceptamos direcciones de los servicios de push conocidos. Si no, alguien podría registrar
 * cualquier URL y usar nuestro servidor para hacer peticiones a donde quiera (ataque "SSRF").
 */
public final class PushEndpoints {
    private PushEndpoints() { }

    public static boolean isAllowed(String endpoint) {
        try {
            URI u = URI.create(endpoint);
            if (!"https".equals(u.getScheme()) || u.getHost() == null) return false;
            String host = u.getHost().toLowerCase(Locale.ROOT);
            return host.equals("web.push.apple.com") || host.endsWith(".push.apple.com")
                    || host.equals("fcm.googleapis.com")
                    || host.endsWith(".push.services.mozilla.com")
                    || host.endsWith(".notify.windows.com");
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
