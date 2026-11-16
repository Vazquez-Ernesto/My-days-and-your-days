package com.mydays;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.mydays.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Test de integración: levanta el servidor completo (con base H2 real y Flyway) y lo usa
 * como lo haría la app, con peticiones HTTP. Es el equivalente a un test E2E pero de la API.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD) // base limpia en cada test
class ApiFlowIT {

    @TestConfiguration
    static class Clocks {
        @Bean @Primary
        MutableClock testClock() { return new MutableClock(Instant.parse("2026-11-16T12:00:00Z")); }
    }

    @Autowired MockMvc mvc;
    @Autowired MutableClock clock;

    String ella, el, extrano;

    @BeforeEach
    void registrarTelefonos() throws Exception {
        ella = register();
        el = register();
        extrano = register();
    }

    // ---------- helpers ----------

    private String register() throws Exception {
        String body = mvc.perform(post("/api/devices"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    private MockHttpServletRequestBuilder as(String token, MockHttpServletRequestBuilder req) {
        return req.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON);
    }

    private String json(MockHttpServletRequestBuilder req) throws Exception {
        return mvc.perform(req).andReturn().getResponse().getContentAsString();
    }

    private static final String SNAPSHOT = "{\"ciphertext\":\"c2VjcmV0bw==\",\"iv\":\"AAECAwQFBgcICQoL\"}";

    /** Ella invita y él acepta. Devuelve el pairId. */
    private String vincular() throws Exception {
        String invite = json(as(ella, post("/api/pairs")));
        String code = JsonPath.read(invite, "$.inviteCode");
        mvc.perform(as(el, post("/api/pairs/join")).content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk());
        return JsonPath.read(invite, "$.pairId");
    }

    // ---------- tests ----------

    @Test
    void flujoCompleto_invitar_aceptar_compartir_leer() throws Exception {
        mvc.perform(as(ella, post("/api/pairs")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("OWNER"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.inviteCode").value(matchesPattern("^[A-Z2-9]{4}-[A-Z2-9]{4}$")))
                .andExpect(jsonPath("$.inviteExpiresAt").value("2026-11-17T12:00:00Z"));

        String code = JsonPath.read(json(as(ella, get("/api/pairs/me"))), "$.inviteCode");
        String pairId = JsonPath.read(json(as(el, post("/api/pairs/join")).content("{\"code\":\"" + code + "\"}")), "$.pairId");

        mvc.perform(as(ella, get("/api/pairs/me")))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.inviteCode").doesNotExist());

        mvc.perform(as(ella, put("/api/pairs/" + pairId + "/snapshot")).content(SNAPSHOT))
                .andExpect(status().isOk());
        mvc.perform(as(el, get("/api/pairs/" + pairId + "/snapshot")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ciphertext").value("c2VjcmV0bw=="))
                .andExpect(jsonPath("$.iv").value("AAECAwQFBgcICQoL"))
                .andExpect(jsonPath("$.updatedAt").value("2026-11-16T12:00:00Z"));
    }

    @Test
    void sinTokenOConTokenFalsoDevuelve401() throws Exception {
        mvc.perform(get("/api/pairs/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(as("token-inventado", get("/api/pairs/me"))).andExpect(status().isUnauthorized());
    }

    @Test
    void unExtranoNoPuedeVerNiModificarElVinculo() throws Exception {
        String pairId = vincular();
        mvc.perform(as(ella, put("/api/pairs/" + pairId + "/snapshot")).content(SNAPSHOT));

        mvc.perform(as(extrano, get("/api/pairs/" + pairId + "/snapshot")))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
        mvc.perform(as(extrano, delete("/api/pairs/" + pairId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void elNoPuedeSobrescribirLosDatosDeElla() throws Exception {
        String pairId = vincular();
        mvc.perform(as(el, put("/api/pairs/" + pairId + "/snapshot")).content(SNAPSHOT))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("OWNER_ONLY"));
    }

    @Test
    void laInvitacionVenceA_las24Horas() throws Exception {
        String code = JsonPath.read(json(as(ella, post("/api/pairs"))), "$.inviteCode");
        clock.advance(Duration.ofHours(24).plusSeconds(1));

        mvc.perform(as(el, post("/api/pairs/join")).content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("INVITE_EXPIRED"))
                .andExpect(jsonPath("$.detail").value("La invitación venció. Pedile que genere una nueva"));
    }

    @Test
    void laInvitacionEsDeUnSoloUso() throws Exception {
        String code = JsonPath.read(json(as(ella, post("/api/pairs"))), "$.inviteCode");
        mvc.perform(as(el, post("/api/pairs/join")).content("{\"code\":\"" + code + "\"}")).andExpect(status().isOk());
        mvc.perform(as(extrano, post("/api/pairs/join")).content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("INVITE_NOT_FOUND"));
    }

    @Test
    void mensajesEnAmbasDirecciones_yPedirSoloLosNuevos() throws Exception {
        String pairId = vincular();
        String base = "/api/pairs/" + pairId + "/messages";
        mvc.perform(as(ella, post(base)).content(SNAPSHOT)).andExpect(status().isCreated());
        clock.advance(Duration.ofMinutes(5));
        String reply = json(as(el, post(base)).content(SNAPSHOT));
        String replyAt = JsonPath.read(reply, "$.createdAt");

        mvc.perform(as(ella, get(base)))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].fromMe").value(true))
                .andExpect(jsonPath("$[1].fromMe").value(false));
        mvc.perform(as(ella, get(base).param("since", "2026-11-16T12:01:00Z")))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].createdAt").value(replyAt));
    }

    @Test
    void noSePuedenMandarMensajesAntesDeQueElAcepte() throws Exception {
        String pairId = JsonPath.read(json(as(ella, post("/api/pairs"))), "$.pairId");
        mvc.perform(as(ella, post("/api/pairs/" + pairId + "/messages")).content(SNAPSHOT))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PAIR_NOT_ACTIVE"));
    }

    @Test
    void desvincularBorraTodoLoCompartido() throws Exception {
        String pairId = vincular();
        mvc.perform(as(ella, put("/api/pairs/" + pairId + "/snapshot")).content(SNAPSHOT));

        mvc.perform(as(el, delete("/api/pairs/" + pairId))).andExpect(status().isNoContent());

        mvc.perform(as(ella, get("/api/pairs/me"))).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NO_PAIR"));
        mvc.perform(as(ella, get("/api/pairs/" + pairId + "/snapshot"))).andExpect(status().isNotFound());
        // y ella puede volver a invitar
        mvc.perform(as(ella, post("/api/pairs"))).andExpect(status().isCreated());
    }

    @Test
    void validaElFormatoDeLoQueLlega() throws Exception {
        String pairId = vincular();
        mvc.perform(as(ella, put("/api/pairs/" + pairId + "/snapshot")).content("{\"ciphertext\":\"no es base64!!\",\"iv\":\"AAECAwQFBgcICQoL\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(as(ella, put("/api/pairs/" + pairId + "/snapshot")).content("{esto no es json"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("MALFORMED_JSON"));
    }

    @Test
    void corsPermiteLaAppDeGitHubPagesYBloqueaOtrosSitios() throws Exception {
        mvc.perform(options("/api/pairs/me")
                        .header("Origin", "https://vazquez-ernesto.github.io")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://vazquez-ernesto.github.io"));
        mvc.perform(options("/api/pairs/me")
                        .header("Origin", "https://sitio-malicioso.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @Test
    void healthCheckParaElHosting() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }
}
