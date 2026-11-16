package com.mydays.push;

/** Envía una notificación a un teléfono. Es una interfaz para poder reemplazarla por una falsa en los tests. */
public interface PushSender {
    enum Result { DELIVERED, GONE, FAILED }

    Result send(PushSubscription subscription, String payloadJson, boolean urgent);
}
