package com.school.dto;

import com.school.entities.PayrollEmployeeType;
import com.school.entities.PayrollStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PayrollRecordDto(
        Long id,
        PayrollEmployeeType employeeType,
        Long employeeId,
        String staffName,
        String position,
        Integer year,
        Integer month,
        BigDecimal basicSalary,
        BigDecimal allowances,
        BigDecimal deductions,
        BigDecimal netPay,
        PayrollStatus status,
        LocalDate paymentDate,
        String paymentMethod,
        String note) {
}
