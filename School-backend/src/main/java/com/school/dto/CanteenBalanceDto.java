package com.school.dto;

import java.math.BigDecimal;

public record CanteenBalanceDto(
        FeeBalanceStudentDto student,
        String billingFrequency,
        String billingPeriod,
        BigDecimal assessedAmount,
        BigDecimal totalPaid,
        BigDecimal balance) {
}
