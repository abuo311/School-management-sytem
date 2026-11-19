package com.school.dto;

public record LmsExamDto(
        Long id,
        String title,
        String description,
        boolean published,
        int maxAttempts,
        Integer timeLimitMinutes,
        int questionCount,
        int totalPoints,
        long attemptsUsed,
        Integer bestScore,
        Long activeAttemptId,
        Long latestAttemptId) {
}
