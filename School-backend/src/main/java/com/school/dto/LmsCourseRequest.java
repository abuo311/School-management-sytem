package com.school.dto;

public record LmsCourseRequest(
        String title,
        String description,
        String className,
        Long subjectId,
        Boolean published) {
}
