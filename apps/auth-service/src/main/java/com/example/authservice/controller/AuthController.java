package com.example.authservice.controller;

import com.example.authservice.client.BillingClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private BillingClient billingClient;

    @GetMapping("/validate")
    public ResponseEntity<Map<String, String>> validate(@RequestParam String userId) {
        MDC.put("userId", userId);
        try {
            return switch (userId) {
                case "banned" -> {
                    log.warn("User is banned: {}", userId);
                    yield ResponseEntity.status(403)
                        .body(Map.of("error", "User is banned", "userId", userId));
                }
                case "unknown" -> {
                    log.error("Unknown user: {}", userId);
                    yield ResponseEntity.status(401)
                        .body(Map.of("error", "Unknown user", "userId", userId));
                }
                default -> {
                    String billing = billingClient.getSubscriptionStatus(userId);
                    if ("suspended".equals(billing)) {
                        log.warn("Billing suspended for user: {}", userId);
                    } else {
                        log.info("User validated successfully: {}", userId);
                    }
                    yield ResponseEntity.ok(
                        Map.of("userId", userId, "status", "valid", "billing", billing)
                    );
                }
            };
        } finally {
            MDC.remove("userId");
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        log.info("Health check");
        return ResponseEntity.ok(Map.of("status", "ok", "service", "auth-service"));
    }
}
