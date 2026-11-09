package com.school.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record LessonNoteDto(
        Long id,
        Long timetableEntryId,
        LocalDate lessonDate,
        String className,
        String subjectName,
        String teacherName,
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        String topic,
        String learningObjectives,
        String lessonActivities,
        String teachingResources,
        String homework,
        List<LessonNoteAttachmentDto> attachments) {
}