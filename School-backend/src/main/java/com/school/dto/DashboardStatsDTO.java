package com.school.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DashboardStatsDTO {
    private long totalStudents;
    private long totalTeachers;
    private long totalTeachingStaff;
    private long totalNonTeachingStaff;
    private long totalStaff;
    private long totalDirectors;
    private long totalManagers;
}