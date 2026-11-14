package com.school.dto;

import java.math.BigDecimal;

public record CanteenPaymentRequest(
        Long studentId,
        BigDecimal amountPaid,
        String paymentMethod) {
}
