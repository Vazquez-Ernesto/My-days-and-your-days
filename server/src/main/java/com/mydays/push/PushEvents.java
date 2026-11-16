package com.mydays.push;

import java.util.UUID;

/** Eventos que publican otros módulos y que el módulo de push escucha. */
public final class PushEvents {
    private PushEvents() { }

    /** Él aceptó la invitación de ella. */
    public record PairJoined(UUID ownerDeviceId) { }

    /** Se envió un mensaje cifrado (momento de ella o respuesta de él). */
    public record MessagePosted(UUID recipientDeviceId, String ciphertext, String iv) { }
}
