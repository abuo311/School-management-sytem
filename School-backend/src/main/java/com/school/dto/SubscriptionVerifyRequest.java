package com.school.dto;

import jakarta.validation.constraints.NotBlank;

public record SubscriptionVerifyRequest(@NotBlank String reference) {
}
