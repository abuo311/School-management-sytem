package com.school.dto;

public record LmsExamOptionDto(
        Long id,
        String text,
        int position,
        Boolean correct) {
}
