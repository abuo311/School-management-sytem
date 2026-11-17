package com.school.dto;

public record LmsLessonRequest(
        String title,
        String content,
        String videoUrl,
        String resourceUrl,
        Integer position) {
}
