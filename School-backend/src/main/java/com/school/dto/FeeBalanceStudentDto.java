package com.school.dto;

public record FeeBalanceStudentDto(
        Long id,
        String firstName,
        String lastName,
        String admissionNumber,
        String gradeLevel,
        String parentContact,
        String parentEmail) {
}