package com.school.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PayrollPaymentRequest(
        @NotBlank @Size(max = 50) String paymentMethod) {
}
