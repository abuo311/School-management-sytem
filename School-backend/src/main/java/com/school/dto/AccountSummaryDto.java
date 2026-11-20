package com.school.dto;

import java.math.BigDecimal;

public record AccountSummaryDto(
        BigDecimal feeIncome,
        BigDecimal canteenIncome,
        BigDecimal totalIncome,
        BigDecimal recordedExpenses,
        BigDecimal payrollPaid,
        BigDecimal totalSpent,
        BigDecimal availableBalance) {
}
