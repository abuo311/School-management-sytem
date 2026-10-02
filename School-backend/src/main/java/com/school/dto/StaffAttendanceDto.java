package com.school.dto;

import java.time.LocalDate;

public record StaffAttendanceDto(
        Long userId,
        String fullName,
        String username,
        String role,
        String staffGroup,
        LocalDate attendanceDate,
        String status,
        String reason) {
}