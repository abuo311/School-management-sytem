package com.school.dto;

import java.util.List;

public record LmsExamQuestionDto(
        Long id,
        String type,
        String prompt,
        int points,
        int position,
        List<LmsExamOptionDto> options) {
}
