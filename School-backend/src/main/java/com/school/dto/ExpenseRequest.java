package com.school.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseRequest(
        String category,
        String description,
        BigDecimal amount,
        LocalDate expenseDate,
        String paymentMethod,
        String note) {
}
