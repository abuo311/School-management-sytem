package com.school.dto;

public record LmsExamAnswerReportDto(
        String prompt,
        String selectedAnswer,
        String correctAnswer,
        boolean correct,
        int pointsAwarded,
        int pointsPossible) {
}
