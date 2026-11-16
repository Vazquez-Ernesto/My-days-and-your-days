package com.mydays.sync;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Lo que manda la app: el texto cifrado y el IV, ambos en base64.
 * Validamos solo forma y tamaño: el contenido es ilegible para el servidor, a propósito.
 */
public record EncryptedPayload(
        @NotBlank @Size(max = 400_000) @Pattern(regexp = "^[A-Za-z0-9+/=_-]+$", message = "debe ser base64") String ciphertext,
        @NotBlank @Size(min = 12, max = 32) @Pattern(regexp = "^[A-Za-z0-9+/=_-]+$", message = "debe ser base64") String iv) { }
