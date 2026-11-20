package com.school.dto;

import java.time.LocalDateTime;

public record SubscriptionStatusDto(
        String status,
        String planCode,
        String planName,
        LocalDateTime accessEndsAt,
        boolean trialUsed,
        boolean paystackConfigured) {
}
