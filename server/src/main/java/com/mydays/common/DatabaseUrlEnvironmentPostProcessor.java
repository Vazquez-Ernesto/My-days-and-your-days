package com.mydays.common;

import java.util.Map;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Si existe DATABASE_URL en formato postgresql:// (como lo entrega Neon), configura la base
 * automáticamente. Así en el hosting alcanza con pegar UNA variable: DATABASE_URL.
 * Si DATABASE_URL ya viene en formato jdbc: (como en la CI), no hace nada.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication application) {
        String url = env.getProperty("DATABASE_URL");
        if (!PostgresUrl.isPostgresUri(url)) return;
        PostgresUrl pg = PostgresUrl.parse(url);
        env.getPropertySources().addFirst(new MapPropertySource("neonDatabaseUrl", Map.of(
                "spring.datasource.url", pg.jdbcUrl(),
                "spring.datasource.username", pg.username(),
                "spring.datasource.password", pg.password())));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE; // después de cargar application.yml y las variables de entorno
    }
}
