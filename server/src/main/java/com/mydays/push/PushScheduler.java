package com.mydays.push;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Revisa cada 30 segundos si hay recordatorios para enviar. Se puede apagar (los tests lo apagan). */
@Component
@ConditionalOnProperty(name = "app.push.scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class PushScheduler {
    private final PushService push;

    public PushScheduler(PushService push) {
        this.push = push;
    }

    @Scheduled(fixedDelayString = "PT30S", initialDelayString = "PT20S")
    public void run() {
        push.sendDue();
    }
}
