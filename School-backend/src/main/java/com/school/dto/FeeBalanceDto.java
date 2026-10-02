package com.school.dto;

import java.math.BigDecimal;

public record FeeBalanceDto(
        FeeBalanceStudentDto student,
        String term,
        String academicYear,
        BigDecimal assessedAmount,
        BigDecimal totalPaid,
        BigDecimal balance) {
}