package com.school.dto;

import java.time.LocalDateTime;

public record LmsExamResultRowDto(
        Long attemptId,
        Long examId,
        String examTitle,
        String studentName,
        String admissionNumber,
        LocalDateTime startedAt,
        LocalDateTime submittedAt,
        int score,
        int maxScore,
        int percentage) {
}
