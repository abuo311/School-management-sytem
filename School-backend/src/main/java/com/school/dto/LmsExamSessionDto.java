package com.school.dto;

import java.time.LocalDateTime;
import java.util.List;

public record LmsExamSessionDto(
        Long attemptId,
        String title,
        String description,
        LocalDateTime startedAt,
        LocalDateTime expiresAt,
        List<LmsExamQuestionDto> questions,
        List<LmsExamAnswerRequest> savedAnswers) {
}
