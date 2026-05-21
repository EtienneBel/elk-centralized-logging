package com.example.authservice.controller;

import com.example.authservice.client.BillingClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private BillingClient billingClient;

    @Test
    void bannedUserReturns403() throws Exception {
        mvc.perform(get("/validate?userId=banned"))
           .andExpect(status().isForbidden());
    }

    @Test
    void unknownUserReturns401() throws Exception {
        mvc.perform(get("/validate?userId=unknown"))
           .andExpect(status().isUnauthorized());
    }

    @Test
    void validUserReturns200WithBillingStatus() throws Exception {
        when(billingClient.getSubscriptionStatus(anyString())).thenReturn("active");
        mvc.perform(get("/validate?userId=alice"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.billing").value("active"));
    }

    @Test
    void suspendedBillingReturns200WithSuspendedStatus() throws Exception {
        when(billingClient.getSubscriptionStatus(anyString())).thenReturn("suspended");
        mvc.perform(get("/validate?userId=alice"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.billing").value("suspended"));
    }

    @Test
    void healthReturns200() throws Exception {
        mvc.perform(get("/health"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.status").value("ok"));
    }
}
