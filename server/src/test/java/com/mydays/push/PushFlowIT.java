package com.mydays.push;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.mydays.support.MutableClock;
import java.security.interfaces.ECPublicKey;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
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

@SpringBootTest(properties = "app.push.scheduler-enabled=false") // el programador lo llamamos a mano
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PushFlowIT {

    /** "Teléfono" falso: guarda las notificaciones en vez de mandarlas a Apple/Google. */
    static class RecordingSender implements PushSender {
        record Sent(String endpoint, String payload, boolean urgent) { }
        final List<Sent> sent = new CopyOnWriteArrayList<>();
        volatile Result next = Result.DELIVERED;

        @Override
        public Result send(PushSubscription s, String payload, boolean urgent) {
            sent.add(new Sent(s.getEndpoint(), payload, urgent));
            return next;
        }
    }

    @TestConfiguration
    static class Config {
        @Bean @Primary MutableClock testClock() { return new MutableClock(Instant.parse("2026-11-16T12:00:00Z")); }
        @Bean @Primary RecordingSender recordingSender() { return new RecordingSender(); }
    }

    @Autowired MockMvc mvc;
    @Autowired MutableClock clock;
    @Autowired RecordingSender sender;
    @Autowired PushService push;

    String ella, el;

    @BeforeEach
    void setUp() throws Exception {
        ella = register();
        el = register();
    }

    private String register() throws Exception {
        return JsonPath.read(mvc.perform(post("/api/devices")).andReturn().getResponse().getContentAsString(), "$.token");
    }

    private MockHttpServletRequestBuilder as(String token, MockHttpServletRequestBuilder req) {
        return req.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON);
    }

    private String json(MockHttpServletRequestBuilder req) throws Exception {
        return mvc.perform(req).andReturn().getResponse().getContentAsString();
    }

    /** Suscripción con claves válidas, como las que genera un iPhone. */
    private String subscription(String endpoint) {
        String p256dh = EcKeys.b64url(EcKeys.encodePublic((ECPublicKey) EcKeys.generate().getPublic()));
        return "{\"endpoint\":\"" + endpoint + "\",\"keys\":{\"p256dh\":\"" + p256dh + "\",\"auth\":\"" + EcKeys.b64url(new byte[16]) + "\"}}";
    }

    private void subscribe(String token, String endpoint) throws Exception {
        mvc.perform(as(token, put("/api/push/subscription")).content(subscription(endpoint))).andExpect(status().isNoContent());
    }

    private void waitForPushes(int n) throws InterruptedException {
        for (int i = 0; i < 50 && sender.sent.size() < n; i++) Thread.sleep(50); // los avisos inmediatos van en otro hilo
        assertThat(sender.sent).hasSize(n);
    }

    @Test
    void laClavePublicaEsPublicaYEstable() throws Exception {
        String a = JsonPath.read(json(get("/api/push/public-key")), "$.publicKey");
        String b = JsonPath.read(json(get("/api/push/public-key")), "$.publicKey");
        assertThat(a).isEqualTo(b);
        assertThat(EcKeys.fromB64(a)).hasSize(65);
    }

    @Test
    void soloAceptaServiciosDePushConocidos() throws Exception {
        subscribe(ella, "https://web.push.apple.com/QGv2x9Abc");
        mvc.perform(as(ella, put("/api/push/subscription")).content(subscription("https://sitio-malicioso.com/robar")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PUSH_ENDPOINT_NOT_ALLOWED"));
        mvc.perform(as(ella, put("/api/push/subscription")).content(subscription("http://fcm.googleapis.com/fcm/send/x")))
                .andExpect(status().isBadRequest());
        mvc.perform(as(ella, put("/api/push/subscription"))
                        .content("{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/x\",\"keys\":{\"p256dh\":\"AAAA\",\"auth\":\"BBBB\"}}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PUSH_KEYS_INVALID"));
    }

    @Test
    void notificacionDePrueba() throws Exception {
        mvc.perform(as(ella, post("/api/push/test"))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_PUSH_SUBSCRIPTION"));
        subscribe(ella, "https://web.push.apple.com/abc");
        mvc.perform(as(ella, post("/api/push/test"))).andExpect(status().isOk()).andExpect(jsonPath("$.result").value("DELIVERED"));
        assertThat(sender.sent).singleElement().satisfies(s -> assertThat(s.payload()).isEqualTo("{\"type\":\"test\"}"));
    }

    @Test
    void cuandoElAceptaAEllaLeLlegaUnAviso_yCuandoElRespondeTambien() throws Exception {
        subscribe(ella, "https://web.push.apple.com/ella");
        subscribe(el, "https://web.push.apple.com/el");
        String invite = json(as(ella, post("/api/pairs")));
        String pairId = JsonPath.read(invite, "$.pairId");
        mvc.perform(as(el, post("/api/pairs/join")).content("{\"code\":\"" + JsonPath.read(invite, "$.inviteCode") + "\"}"));

        waitForPushes(1);
        assertThat(sender.sent.get(0)).satisfies(s -> {
            assertThat(s.endpoint()).endsWith("/ella");
            assertThat(s.payload()).isEqualTo("{\"type\":\"joined\"}");
        });

        mvc.perform(as(el, post("/api/pairs/" + pairId + "/messages")).content("{\"ciphertext\":\"cmVzcHVlc3Rh\",\"iv\":\"AAECAwQFBgcICQoL\"}"));
        waitForPushes(2);
        assertThat(sender.sent.get(1)).satisfies(s -> {
            assertThat(s.endpoint()).endsWith("/ella"); // a ella, no a él
            assertThat(s.payload()).contains("\"type\":\"message\"", "\"ciphertext\":\"cmVzcHVlc3Rh\"");
            assertThat(s.urgent()).isTrue();
        });
    }

    @Test
    void recordatoriosProgramados_seEnvianASuHora() throws Exception {
        subscribe(ella, "https://web.push.apple.com/ella");
        String body = """
                {"items":[
                  {"sendAt":"2026-11-16T12:30:00Z","ciphertext":"cGlsZG9yYQ==","iv":"AAECAwQFBgcICQoL"},
                  {"sendAt":"2026-11-18T09:00:00Z","ciphertext":"cGVyaW9kbw==","iv":"AAECAwQFBgcICQoL"},
                  {"sendAt":"2027-01-01T09:00:00Z","ciphertext":"bGVqb3M=","iv":"AAECAwQFBgcICQoL"}
                ]}""";
        mvc.perform(as(ella, put("/api/push/schedule")).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.scheduled").value(2)); // el de 2027 está demasiado lejos

        assertThat(push.sendDue()).isZero(); // 12:00: todavía no
        clock.advance(Duration.ofMinutes(31));
        assertThat(push.sendDue()).isEqualTo(1); // 12:31: sale la píldora
        assertThat(sender.sent).singleElement().satisfies(s ->
                assertThat(s.payload()).isEqualTo("{\"type\":\"reminder\",\"key\":\"self\",\"ciphertext\":\"cGlsZG9yYQ==\",\"iv\":\"AAECAwQFBgcICQoL\"}"));
        assertThat(push.sendDue()).isZero(); // no se repite
    }

    @Test
    void siElServidorDurmioMuchoNoMandaAvisosViejos() throws Exception {
        subscribe(ella, "https://web.push.apple.com/ella");
        mvc.perform(as(ella, put("/api/push/schedule"))
                .content("{\"items\":[{\"sendAt\":\"2026-11-16T12:10:00Z\",\"ciphertext\":\"eA==\",\"iv\":\"AAECAwQFBgcICQoL\"}]}"));
        clock.advance(Duration.ofHours(5));
        assertThat(push.sendDue()).isZero();
        assertThat(sender.sent).isEmpty();
        assertThat(push.sendDue()).isZero(); // y lo borró
    }

    @Test
    void subirUnaListaNuevaReemplazaLaAnterior() throws Exception {
        subscribe(ella, "https://web.push.apple.com/ella");
        mvc.perform(as(ella, put("/api/push/schedule"))
                .content("{\"items\":[{\"sendAt\":\"2026-11-17T09:00:00Z\",\"ciphertext\":\"YQ==\",\"iv\":\"AAECAwQFBgcICQoL\"}]}"));
        mvc.perform(as(ella, put("/api/push/schedule")).content("{\"items\":[]}"))
                .andExpect(jsonPath("$.scheduled").value(0));
        clock.advance(Duration.ofDays(1));
        assertThat(push.sendDue()).isZero();
    }

    @Test
    void siElTelefonoYaNoEstaSuscritoSeBorraLaSuscripcion() throws Exception {
        subscribe(ella, "https://web.push.apple.com/ella");
        sender.next = PushSender.Result.GONE;
        mvc.perform(as(ella, post("/api/push/test"))).andExpect(status().isBadGateway());
        mvc.perform(as(ella, post("/api/push/test"))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_PUSH_SUBSCRIPTION"));
    }

    @Test
    void sinTokenNoSePuedeSuscribir() throws Exception {
        mvc.perform(put("/api/push/subscription").contentType(MediaType.APPLICATION_JSON).content(subscription("https://web.push.apple.com/x")))
                .andExpect(status().isUnauthorized());
    }
}
