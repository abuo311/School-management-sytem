package com.school.dto;

import com.school.entities.PayrollEmployeeType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PayrollRecordRequest(
        @NotNull PayrollEmployeeType employeeType,
        @NotNull Long employeeId,
        @NotNull @Min(2000) @Max(9999) Integer year,
        @NotNull @Min(1) @Max(12) Integer month,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal basicSalary,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal allowances,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal deductions,
        @Size(max = 500) String note) {
}
