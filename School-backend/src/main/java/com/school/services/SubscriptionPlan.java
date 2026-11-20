package com.school.services;

import com.school.dto.SubscriptionPlanDto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

enum SubscriptionPlan {
    STANDARD_FOUR_MONTHS("Standard - 4 Months", "4 months", 4, "1000.00"),
    PREMIUM_FOUR_MONTHS("Premium - 4 Months", "4 months", 4, "2000.00"),
    STANDARD_ACADEMIC_YEAR("Standard - 1 Academic Year", "1 academic year", 12, "2000.00"),
    PREMIUM_ACADEMIC_YEAR("Premium - 1 Academic Year", "1 academic year", 12, "3500.00");

    private final String name;
    private final String duration;
    private final int durationMonths;
    private final BigDecimal amount;

    SubscriptionPlan(String name, String duration, int durationMonths, String amount) {
        this.name = name;
        this.duration = duration;
        this.durationMonths = durationMonths;
        this.amount = new BigDecimal(amount);
    }

    String code() {
        return name();
    }

    String planName() {
        return name;
    }

    int durationMonths() {
        return durationMonths;
    }

    BigDecimal amount() {
        return amount;
    }

    SubscriptionPlanDto toDto() {
        return new SubscriptionPlanDto(code(), name, duration, durationMonths, amount, "GHS");
    }

    static SubscriptionPlan fromCode(String code) {
        return Arrays.stream(values())
                .filter(plan -> plan.code().equalsIgnoreCase(code == null ? "" : code.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Select a valid subscription plan."));
    }

    static List<SubscriptionPlanDto> allPlans() {
        return Arrays.stream(values()).map(SubscriptionPlan::toDto).toList();
    }

    LocalDateTime addDurationTo(LocalDateTime date) {
        return date.plusMonths(durationMonths);
    }
}
