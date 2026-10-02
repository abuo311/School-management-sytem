package com.school.dto;

public record StaffAttendanceRequest(Long userId, String status, String reason) {
}