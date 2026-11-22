package com.mydays.billing;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Sin token de Mercado Pago, los pagos están apagados y nadie queda a medio cobrar. */
@SpringBootTest(properties = "app.push.scheduler-enabled=false")
@AutoConfigureMockMvc
class BillingDisabledIT {
    @Autowired MockMvc mvc;

    @Test
    void sin_configuracion_los_pagos_estan_desactivados() throws Exception {
        mvc.perform(get("/api/billing/prices")).andExpect(jsonPath("$.enabled").value(false));
        String token = JsonPath.read(mvc.perform(post("/api/devices")).andReturn().getResponse().getContentAsString(), "$.token");
        mvc.perform(post("/api/billing/checkout").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"period\":\"MONTHLY\",\"email\":\"ana@example.com\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("BILLING_DISABLED"));
        mvc.perform(get("/api/billing/me").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.plan").value("free"));
    }
}
