package com.mydays.common;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Convierte la URL que da Neon (y casi todos los hostings):
 *   postgresql://usuario:clave@host/base?sslmode=require&channel_binding=require
 * al formato que necesita Java (JDBC), con usuario y clave por separado:
 *   jdbc:postgresql://host/base?sslmode=require&channelBinding=require
 */
public record PostgresUrl(String jdbcUrl, String username, String password) {

    public static boolean isPostgresUri(String value) {
        return value != null && (value.startsWith("postgresql://") || value.startsWith("postgres://"));
    }

    public static PostgresUrl parse(String value) {
        if (!isPostgresUri(value)) throw new IllegalArgumentException("No es una URL postgresql://");
        URI uri = URI.create(value);
        String userInfo = uri.getRawUserInfo();
        if (userInfo == null || !userInfo.contains(":")) throw new IllegalArgumentException("Falta usuario:clave en la URL");
        String user = decode(userInfo.substring(0, userInfo.indexOf(':')));
        String pass = decode(userInfo.substring(userInfo.indexOf(':') + 1));

        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
        if (uri.getPort() != -1) jdbc.append(':').append(uri.getPort());
        jdbc.append(uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/postgres" : uri.getRawPath());

        List<String> params = new ArrayList<>();
        if (uri.getRawQuery() != null) {
            for (String p : uri.getRawQuery().split("&")) {
                if (p.isBlank()) continue;
                // libpq usa channel_binding; el driver JDBC lo llama channelBinding
                params.add(p.startsWith("channel_binding=") ? "channelBinding=" + p.substring("channel_binding=".length()) : p);
            }
        }
        if (params.stream().noneMatch(p -> p.startsWith("sslmode="))) params.add("sslmode=require");
        jdbc.append('?').append(String.join("&", params));
        return new PostgresUrl(jdbc.toString(), user, pass);
    }

    private static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }

    /** Nunca mostrar la clave en logs. */
    @Override
    public String toString() {
        return "PostgresUrl[" + jdbcUrl + ", user=" + username + ", password=***]";
    }
}
