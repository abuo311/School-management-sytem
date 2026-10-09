package com.school.dto;

import java.time.LocalDate;

public record StaffAttendanceDto(
        Long userId,
        Long nonTeachingStaffId,
        String fullName,
        String username,
        String role,
        String staffGroup,
        String profilePhoto,
        LocalDate attendanceDate,
        String status,
        String reason) {
}