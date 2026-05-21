package com.example.authservice.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class BillingClient {

    private static final Logger log = LoggerFactory.getLogger(BillingClient.class);

    @Value("${billing.service.url:http://billing-api:8000}")
    private String billingServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getSubscriptionStatus(String userId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            String correlationId = MDC.get("correlationId");
            if (correlationId != null) headers.set("X-Correlation-ID", correlationId);

            ResponseEntity<Map> response = restTemplate.exchange(
                billingServiceUrl + "/subscription?userId=" + userId,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
            );
            Map<?, ?> body = response.getBody();
            if (body == null) return "unknown";
            Object status = body.get("status");
            return status instanceof String s ? s : "unknown";
        } catch (HttpClientErrorException e) {
            log.error("Billing service error for userId {}: {}", userId, e.getStatusCode());
            return "not-found";
        } catch (Exception e) {
            log.error("Failed to call billing service for userId: {}", userId, e);
            return "unknown";
        }
    }
}
