package com.school.dto;

import java.util.List;

public record LmsExamEditorDto(
        Long id,
        String title,
        String description,
        boolean published,
        int maxAttempts,
        Integer timeLimitMinutes,
        List<LmsExamQuestionDto> questions) {
}
