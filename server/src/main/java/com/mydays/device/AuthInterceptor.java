package com.mydays.device;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Se ejecuta ANTES de cada controlador de /api/**: lee "Authorization: Bearer <token>",
 * busca el dispositivo y lo deja guardado en la petición. Si el token no sirve → 401.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {
    public static final String ATTR = "mydays.device";
    private final DeviceService devices;

    public AuthInterceptor(DeviceService devices) {
        this.devices = devices;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equals(request.getMethod())) return true; // preflight de CORS
        String header = request.getHeader("Authorization");
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : null;
        request.setAttribute(ATTR, devices.authenticate(token));
        return true;
    }
}
