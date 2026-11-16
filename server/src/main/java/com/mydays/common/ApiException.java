package com.mydays.common;

import org.springframework.http.HttpStatus;

/**
 * Error de negocio con un código fijo (ej. INVITE_EXPIRED) que la app traduce a un mensaje en pantalla.
 * Usamos métodos estáticos para que el código que lanza errores se lea como una oración.
 */
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static ApiException notFound(String code, String message) { return new ApiException(HttpStatus.NOT_FOUND, code, message); }
    public static ApiException forbidden(String code, String message) { return new ApiException(HttpStatus.FORBIDDEN, code, message); }
    public static ApiException conflict(String code, String message) { return new ApiException(HttpStatus.CONFLICT, code, message); }
    public static ApiException gone(String code, String message) { return new ApiException(HttpStatus.GONE, code, message); }
    public static ApiException unauthorized(String message) { return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message); }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
