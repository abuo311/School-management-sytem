package com.school.dto;

import java.time.LocalDateTime;
import java.util.List;

public record LmsCourseDto(
        Long id,
        String title,
        String description,
        String className,
        Long subjectId,
        String subjectName,
        String teacherName,
        boolean published,
        LocalDateTime createdAt,
        List<LmsLessonDto> lessons,
        int completedLessons) {
}
