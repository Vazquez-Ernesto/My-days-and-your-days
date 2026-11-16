package com.mydays.common;

import com.mydays.device.AuthInterceptor;
import com.mydays.device.CurrentDeviceResolver;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final AuthInterceptor auth;
    private final CurrentDeviceResolver currentDevice;
    private final String[] allowedOrigins;

    public WebConfig(AuthInterceptor auth, CurrentDeviceResolver currentDevice,
                     @Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.auth = auth;
        this.currentDevice = currentDevice;
        this.allowedOrigins = allowedOrigins.split("\\s*,\\s*");
    }

    /** Todas las rutas /api/** piden token, salvo el registro de dispositivos. */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(auth).addPathPatterns("/api/**").excludePathPatterns("/api/devices");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentDevice);
    }

    /** CORS: el navegador solo deja que la app (en otro dominio) llame a la API si la autorizamos acá. */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type")
                .maxAge(3600);
    }
}
