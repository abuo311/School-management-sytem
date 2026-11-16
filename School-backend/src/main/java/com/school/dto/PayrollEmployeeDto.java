package com.school.dto;

import com.school.entities.PayrollEmployeeType;

public record PayrollEmployeeDto(
        PayrollEmployeeType employeeType,
        Long employeeId,
        String fullName,
        String position) {
}
