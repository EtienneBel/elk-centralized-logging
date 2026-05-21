package com.example.fraudservice.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class FraudControllerTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void normalTransactionReturns200WithLowScore() throws Exception {
        mvc.perform(post("/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountId\":\"ACC001\",\"amount\":100}"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.approved").value(true))
           .andExpect(jsonPath("$.score").value(20));
    }

    @Test
    void blacklistedAccountReturns403() throws Exception {
        mvc.perform(post("/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountId\":\"ACC_BLOCKED\",\"amount\":100}"))
           .andExpect(status().isForbidden())
           .andExpect(jsonPath("$.approved").value(false))
           .andExpect(jsonPath("$.reason").value("Blacklisted account"));
    }

    @Test
    void largeAmountReturns200WithScore75() throws Exception {
        mvc.perform(post("/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountId\":\"ACC001\",\"amount\":15000}"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.approved").value(true))
           .andExpect(jsonPath("$.score").value(75));
    }

    @Test
    void velocityAttackReturns403() throws Exception {
        String body = "{\"accountId\":\"ACC_VEL_TEST\",\"amount\":100}";
        mvc.perform(post("/check").contentType(MediaType.APPLICATION_JSON).content(body))
           .andExpect(status().isOk());
        mvc.perform(post("/check").contentType(MediaType.APPLICATION_JSON).content(body))
           .andExpect(status().isOk());
        mvc.perform(post("/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
           .andExpect(status().isForbidden())
           .andExpect(jsonPath("$.approved").value(false))
           .andExpect(jsonPath("$.reason").value("Velocity attack detected"));
    }

    @Test
    void healthReturns200() throws Exception {
        mvc.perform(get("/health"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.status").value("ok"));
    }
}
