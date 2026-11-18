package com.school.dto;

import java.util.List;

public record LmsLessonDto(
        Long id,
        String title,
        String content,
        String videoUrl,
        String resourceUrl,
        int position,
        boolean completed,
        List<LmsLessonImageDto> images) {
}
