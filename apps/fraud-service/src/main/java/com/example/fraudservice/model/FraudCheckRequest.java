package com.example.fraudservice.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record FraudCheckRequest(
    @NotBlank String accountId,
    @Positive double amount
) {}
