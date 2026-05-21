package com.example.fraudservice.model;

public record FraudCheckResponse(boolean approved, int score, String reason) {}
