package com.mydays.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class PostgresUrlTest {

    @Test
    void convierteLaUrlDeNeonAJdbc() {
        PostgresUrl pg = PostgresUrl.parse(
                "postgresql://neondb_owner:npg_abc123@ep-x-y.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
        assertThat(pg.jdbcUrl()).isEqualTo(
                "jdbc:postgresql://ep-x-y.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&channelBinding=require");
        assertThat(pg.username()).isEqualTo("neondb_owner");
        assertThat(pg.password()).isEqualTo("npg_abc123");
    }

    @Test
    void respetaElPuertoYDecodificaCaracteresEspeciales() {
        PostgresUrl pg = PostgresUrl.parse("postgres://ana%40mail:cl%40ve%2F1@db.host:6543/app");
        assertThat(pg.jdbcUrl()).isEqualTo("jdbc:postgresql://db.host:6543/app?sslmode=require"); // SSL por defecto
        assertThat(pg.username()).isEqualTo("ana@mail");
        assertThat(pg.password()).isEqualTo("cl@ve/1");
    }

    @Test
    void noMuestraLaClaveAlImprimir() {
        assertThat(PostgresUrl.parse("postgresql://u:secreta@h/db").toString()).doesNotContain("secreta");
    }

    @Test
    void reconoceSoloUrlsPostgres() {
        assertThat(PostgresUrl.isPostgresUri("jdbc:postgresql://h/db")).isFalse();
        assertThat(PostgresUrl.isPostgresUri(null)).isFalse();
        assertThatThrownBy(() -> PostgresUrl.parse("postgresql://h/db")).isInstanceOf(IllegalArgumentException.class);
    }
}
