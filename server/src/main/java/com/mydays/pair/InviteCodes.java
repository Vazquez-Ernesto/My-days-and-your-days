package com.mydays.pair;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.regex.Pattern;

/** Códigos de invitación "XXXX-XXXX" sin caracteres que se confunden (0/O, 1/I/L). Igual que en la app. */
public final class InviteCodes {
    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final Pattern FORMAT = Pattern.compile("^[A-Z0-9]{4}-[A-Z0-9]{4}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private InviteCodes() { }

    public static String generate() {
        StringBuilder sb = new StringBuilder(9);
        for (int i = 0; i < 8; i++) {
            if (i == 4) sb.append('-');
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    /** Acepta "ab2c-d3ef" o " AB2C-D3EF " y devuelve "AB2C-D3EF"; null si el formato no es válido. */
    public static String normalize(String raw) {
        if (raw == null) return null;
        String code = raw.trim().toUpperCase(Locale.ROOT);
        return FORMAT.matcher(code).matches() ? code : null;
    }
}
