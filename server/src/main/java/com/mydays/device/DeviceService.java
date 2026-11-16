package com.mydays.device;

import com.mydays.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Lógica de negocio de dispositivos. Los controladores solo traducen HTTP ↔ Java y llaman a servicios. */
@Service
public class DeviceService {
    private final DeviceRepository devices;
    private final Clock clock;

    // Inyección por constructor: Spring pasa las dependencias. En los tests podemos pasar las nuestras.
    public DeviceService(DeviceRepository devices, Clock clock) {
        this.devices = devices;
        this.clock = clock;
    }

    /** El token se devuelve UNA sola vez; nosotros guardamos solo su hash. */
    @Transactional
    public RegisteredDevice register() {
        String token = Tokens.newToken();
        Device device = devices.save(new Device(UUID.randomUUID(), Tokens.sha256(token), Instant.now(clock)));
        return new RegisteredDevice(device.getId(), token);
    }

    @Transactional(readOnly = true)
    public Device authenticate(String token) {
        if (token == null || token.isBlank()) throw ApiException.unauthorized("Falta el token del dispositivo");
        return devices.findByTokenHash(Tokens.sha256(token))
                .orElseThrow(() -> ApiException.unauthorized("Token inválido"));
    }

    public record RegisteredDevice(UUID deviceId, String token) { }
}
