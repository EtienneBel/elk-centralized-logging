package com.example.fraudservice.controller;

import com.example.fraudservice.model.FraudCheckRequest;
import com.example.fraudservice.model.FraudCheckResponse;
import com.example.fraudservice.service.FraudService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class FraudController {

    private static final Logger log = LoggerFactory.getLogger(FraudController.class);

    private final FraudService fraudService;

    public FraudController(FraudService fraudService) {
        this.fraudService = fraudService;
    }

    @PostMapping("/check")
    public ResponseEntity<FraudCheckResponse> check(@Valid @RequestBody FraudCheckRequest request) {
        FraudCheckResponse result = fraudService.check(request.accountId(), request.amount());

        if (!result.approved()) {
            log.error("Transaction blocked: {} — accountId={}, score={}",
                    result.reason(), request.accountId(), result.score());
        } else if (result.score() >= 75) {
            log.warn("Large amount flagged — accountId={}, amount={}, score={}",
                    request.accountId(), request.amount(), result.score());
        } else {
            log.info("Transaction approved — accountId={}, amount={}, score={}",
                    request.accountId(), request.amount(), result.score());
        }

        int status = result.approved() ? 200 : 403;
        return ResponseEntity.status(status).body(result);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        log.info("Health check");
        return ResponseEntity.ok(Map.of("status", "ok", "service", "fraud-service"));
    }
}
