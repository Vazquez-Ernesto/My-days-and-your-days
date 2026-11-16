package com.mydays.pair;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mydays.common.ApiException;
import com.mydays.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

/**
 * Test unitario: el repositorio es un "mock" (de mentira), así probamos SOLO las reglas del servicio,
 * sin base de datos. Corre en milisegundos.
 */
@ExtendWith(MockitoExtension.class)
class PairServiceTest {
    private static final Instant T0 = Instant.parse("2026-11-16T12:00:00Z");
    private final UUID ella = UUID.randomUUID();
    private final UUID el = UUID.randomUUID();

    @Mock PairRepository repo;
    MutableClock clock;
    PairService service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(T0);
        service = new PairService(repo, clock, Duration.ofHours(24), event -> { });
    }

    /** Solo en los tests donde se guarda algo: save devuelve lo mismo que recibe. */
    private void saveReturnsArgument() {
        when(repo.save(any(Pair.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Pair pendingInvite(String code) {
        Pair p = new Pair(UUID.randomUUID(), ella, T0);
        p.newInvite(code, T0.plus(Duration.ofHours(24)));
        return p;
    }

    private static HttpStatus statusOf(Throwable t) { return ((ApiException) t).getStatus(); }
    private static String codeOf(Throwable t) { return ((ApiException) t).getCode(); }

    @Test
    void ellaCreaUnaInvitacionQueVenceEn24Horas() {
        when(repo.findByMember(ella)).thenReturn(Optional.empty());
        when(repo.findByInviteCode(anyString())).thenReturn(Optional.empty());
        saveReturnsArgument();

        PairView view = service.createInvite(ella);

        assertThat(view.role()).isEqualTo(PairView.Role.OWNER);
        assertThat(view.status()).isEqualTo(PairView.Status.PENDING);
        assertThat(view.inviteCode()).matches("^[A-Z2-9]{4}-[A-Z2-9]{4}$");
        assertThat(view.inviteExpiresAt()).isEqualTo(T0.plus(Duration.ofHours(24)));
    }

    @Test
    void elAceptaYLaInvitacionSeConsume() {
        Pair pair = pendingInvite("AB2C-D3EF");
        when(repo.findByInviteCode("AB2C-D3EF")).thenReturn(Optional.of(pair));
        when(repo.findByMember(el)).thenReturn(Optional.empty());
        saveReturnsArgument();

        PairView view = service.join(el, "ab2c-d3ef"); // en minúsculas también funciona

        assertThat(view.role()).isEqualTo(PairView.Role.PARTNER);
        assertThat(view.status()).isEqualTo(PairView.Status.ACTIVE);
        assertThat(view.inviteCode()).isNull(); // él nunca ve el código
        assertThat(pair.getInviteCode()).isNull(); // y ya no sirve para otro
    }

    @Test
    void unaInvitacionVencidaDevuelve410() {
        when(repo.findByInviteCode("AB2C-D3EF")).thenReturn(Optional.of(pendingInvite("AB2C-D3EF")));
        clock.advance(Duration.ofHours(24)); // justo al vencer

        assertThatThrownBy(() -> service.join(el, "AB2C-D3EF"))
                .satisfies(e -> {
                    assertThat(statusOf(e)).isEqualTo(HttpStatus.GONE);
                    assertThat(codeOf(e)).isEqualTo("INVITE_EXPIRED");
                });
        verify(repo, never()).save(any());
    }

    @Test
    void ellaNoPuedeAceptarSuPropiaInvitacion() {
        when(repo.findByInviteCode("AB2C-D3EF")).thenReturn(Optional.of(pendingInvite("AB2C-D3EF")));

        assertThatThrownBy(() -> service.join(ella, "AB2C-D3EF"))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("CANNOT_JOIN_OWN_INVITE"));
    }

    @Test
    void unTelefonoNoPuedeEstarEnDosVinculos() {
        when(repo.findByInviteCode("AB2C-D3EF")).thenReturn(Optional.of(pendingInvite("AB2C-D3EF")));
        when(repo.findByMember(el)).thenReturn(Optional.of(new Pair(UUID.randomUUID(), UUID.randomUUID(), T0)));

        assertThatThrownBy(() -> service.join(el, "AB2C-D3EF"))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("ALREADY_PAIRED"));
    }

    @Test
    void conUnaParejaActivaNoSePuedeInvitarAOtra() {
        Pair active = pendingInvite("AB2C-D3EF");
        active.join(el, T0);
        when(repo.findByMember(ella)).thenReturn(Optional.of(active));

        assertThatThrownBy(() -> service.createInvite(ella))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("ALREADY_PAIRED"));
    }

    @Test
    void codigoConFormatoInvalidoDevuelve404SinConsultarLaBase() {
        assertThatThrownBy(() -> service.join(el, "hola"))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("INVITE_NOT_FOUND"));
        verify(repo, never()).findByInviteCode(anyString());
    }
}
