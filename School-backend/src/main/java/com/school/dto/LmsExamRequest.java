package com.school.dto;

import java.util.List;

public record LmsExamRequest(
        String title,
        String description,
        Integer maxAttempts,
        Integer timeLimitMinutes,
        Boolean published,
        List<LmsExamQuestionRequest> questions) {
}
