package com.school.dto;

import java.time.LocalTime;

public record TimetableEntryRequest(
        Long classId,
        Long subjectId,
        Long teacherId,
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        String room) {
}