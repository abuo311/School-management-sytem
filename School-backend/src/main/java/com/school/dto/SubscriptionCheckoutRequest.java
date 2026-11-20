package com.school.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SubscriptionCheckoutRequest(
        @NotBlank String planCode,
        @NotBlank @Email String email) {
}
