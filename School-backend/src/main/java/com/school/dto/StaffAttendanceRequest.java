package com.school.dto;

public record StaffAttendanceRequest(Long userId, Long nonTeachingStaffId, String status, String reason) {
}