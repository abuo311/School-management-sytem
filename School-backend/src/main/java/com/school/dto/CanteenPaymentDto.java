package com.school.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CanteenPaymentDto(
        Long id,
        BigDecimal amountPaid,
        String billingFrequency,
        String billingPeriod,
        String paymentMethod,
        String receivedBy,
        LocalDate datePaid) {
}
