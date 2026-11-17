package com.school.dto;

public record LmsLessonDto(
        Long id,
        String title,
        String content,
        String videoUrl,
        String resourceUrl,
        int position,
        boolean completed) {
}
