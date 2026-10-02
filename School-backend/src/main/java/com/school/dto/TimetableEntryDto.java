package com.school.dto;

import java.time.LocalTime;

public record TimetableEntryDto(
        Long id,
        Long classId,
        String className,
        Long subjectId,
        String subjectName,
        Long teacherId,
        String teacherName,
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        String room,
        String term,
        String academicYear) {
}