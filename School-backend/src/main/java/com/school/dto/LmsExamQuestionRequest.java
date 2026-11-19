package com.school.dto;

import java.util.List;

public record LmsExamQuestionRequest(
        String type,
        String prompt,
        Integer points,
        List<String> options,
        Integer correctOptionIndex) {
}
