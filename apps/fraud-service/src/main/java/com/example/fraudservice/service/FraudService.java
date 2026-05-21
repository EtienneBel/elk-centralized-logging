package com.example.fraudservice.service;

import com.example.fraudservice.model.FraudCheckResponse;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FraudService {

    private static final Set<String> BLACKLIST = Set.of("ACC_BLOCKED");
    private static final int VELOCITY_THRESHOLD = 3;
    private static final long VELOCITY_WINDOW_SECONDS = 60;
    private static final int LARGE_AMOUNT_THRESHOLD = 10_000;

    private final Map<String, List<Instant>> history = new ConcurrentHashMap<>();

    public FraudCheckResponse check(String accountId, double amount) {
        if (BLACKLIST.contains(accountId)) {
            return new FraudCheckResponse(false, 95, "Blacklisted account");
        }

        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(VELOCITY_WINDOW_SECONDS);
        int[] countHolder = {0};

        // Atomic: prune expired entries, add current, count — all under the bucket lock
        history.compute(accountId, (k, list) -> {
            if (list == null) list = new ArrayList<>();
            list.removeIf(t -> t.isBefore(cutoff));
            list.add(now);
            countHolder[0] = list.size();
            return list;
        });

        if (countHolder[0] >= VELOCITY_THRESHOLD) {
            return new FraudCheckResponse(false, 90, "Velocity attack detected");
        }

        if (amount > LARGE_AMOUNT_THRESHOLD) {
            return new FraudCheckResponse(true, 75, "Large amount flagged");
        }

        return new FraudCheckResponse(true, 20, "OK");
    }
}
