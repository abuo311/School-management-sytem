package com.school.dto;

import java.time.LocalDate;

public record LessonNoteRequest(
        Long timetableEntryId,
        LocalDate lessonDate,
        String topic,
        String learningObjectives,
        String lessonActivities,
        String teachingResources,
        String homework) {
}