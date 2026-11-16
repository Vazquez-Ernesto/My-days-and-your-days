package com.mydays.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Activa @Async (enviar notificaciones sin demorar la respuesta) y @Scheduled (recordatorios). */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig { }
