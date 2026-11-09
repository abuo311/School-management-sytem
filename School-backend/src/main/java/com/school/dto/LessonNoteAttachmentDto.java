package com.school.dto;

public record LessonNoteAttachmentDto(
        Long id,
        String fileName,
        String contentType,
        long fileSize) {
}
