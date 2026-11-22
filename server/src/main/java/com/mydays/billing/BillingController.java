package com.mydays.billing;

import com.mydays.device.CurrentDevice;
import com.mydays.device.Device;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing")
public class BillingController {
    private final BillingService billing;

    public BillingController(BillingService billing) {
        this.billing = billing;
    }

    /** Pública: precios y si los pagos están habilitados. */
    @GetMapping("/prices")
    public BillingService.Prices prices() {
        return billing.prices();
    }

    public record CheckoutRequest(@NotNull BillingPeriod period, @NotBlank @Email @Size(max = 254) String email) { }

    /** Devuelve { checkoutUrl }: la app abre ese link de Mercado Pago para cargar el medio de pago. */
    @PostMapping("/checkout")
    public Map<String, String> checkout(@CurrentDevice Device device, @Valid @RequestBody CheckoutRequest body) {
        return Map.of("checkoutUrl", billing.checkout(device.getId(), body.period(), body.email()));
    }

    @GetMapping("/me")
    public BillingService.Status me(@CurrentDevice Device device) {
        return billing.status(device.getId());
    }

    @PostMapping("/cancel")
    public BillingService.Status cancel(@CurrentDevice Device device) {
        return billing.cancel(device.getId());
    }

    /**
     * Pública: Mercado Pago avisa acá cuando cambia una suscripción. Llega como
     * ?type=subscription_preapproval&data.id=... o en el cuerpo { "type": ..., "data": { "id": ... } }.
     */
    @PostMapping("/webhook")
    public Map<String, Boolean> webhook(@RequestParam(name = "type", required = false) String type,
                                        @RequestParam(name = "topic", required = false) String topic,
                                        @RequestParam(name = "data.id", required = false) String dataId,
                                        @RequestParam(name = "id", required = false) String id,
                                        @RequestBody(required = false) Map<String, Object> body) {
        String kind = first(type, topic, body == null ? null : (String) body.get("type"));
        String preapprovalId = first(dataId, id, body != null && body.get("data") instanceof Map<?, ?> d && d.get("id") != null ? d.get("id").toString() : null);
        if (kind != null && kind.contains("preapproval")) billing.onNotification(preapprovalId);
        return Map.of("received", true);
    }

    private static String first(String... values) {
        for (String v : values) if (v != null && !v.isBlank()) return v;
        return null;
    }
}
