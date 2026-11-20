package com.school.dto;

import java.math.BigDecimal;

public record SubscriptionPlanDto(
        String code,
        String name,
        String duration,
        int durationMonths,
        BigDecimal amount,
        String currency) {
}
