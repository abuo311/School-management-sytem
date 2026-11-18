package com.school.dto;

public record LmsLessonImageDto(
        Long id,
        String fileName,
        String contentType,
        long fileSize) {
}
