package com.school.dto;

import java.time.LocalDateTime;
import java.util.List;

public record LmsExamReportDto(
        Long attemptId,
        String examTitle,
        String studentName,
        String className,
        LocalDateTime startedAt,
        LocalDateTime submittedAt,
        int score,
        int maxScore,
        int percentage,
        List<LmsExamAnswerReportDto> answers) {
}
