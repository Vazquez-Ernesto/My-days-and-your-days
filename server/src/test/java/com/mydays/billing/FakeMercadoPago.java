package com.mydays.billing;

import com.mydays.common.ApiException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

/** Mercado Pago de mentira: guarda lo que le pidieron y deja que el test decida el estado de cada suscripción. */
public class FakeMercadoPago implements MercadoPago {
    public final List<NewPreapproval> created = new ArrayList<>();
    private final Map<String, Preapproval> byId = new HashMap<>();
    public boolean down = false;

    @Override
    public synchronized Preapproval create(NewPreapproval r) {
        failIfDown();
        created.add(r);
        String id = "pre_" + java.util.UUID.randomUUID();
        Preapproval p = new Preapproval(id, PENDING, "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=" + id, null, r.externalReference());
        byId.put(id, p);
        return p;
    }

    @Override
    public synchronized Preapproval get(String id) {
        failIfDown();
        Preapproval p = byId.get(id);
        if (p == null) throw ApiException.notFound("NOT_FOUND", "no existe");
        return p;
    }

    @Override
    public synchronized Preapproval cancel(String id) {
        Preapproval p = get(id);
        return set(id, CANCELLED, p.nextPaymentAt());
    }

    /** Simula lo que pasa en Mercado Pago (la persona pagó, se canceló desde su app, etc.). */
    public synchronized Preapproval set(String id, String status, Instant nextPaymentAt) {
        Preapproval p = byId.get(id);
        Preapproval updated = new Preapproval(id, status, p.initPoint(), nextPaymentAt, p.externalReference());
        byId.put(id, updated);
        return updated;
    }

    private void failIfDown() {
        if (down) throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_PROVIDER_ERROR", "caído");
    }
}
