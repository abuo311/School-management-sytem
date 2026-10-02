package com.school.dto;

public record IssueFeesResponse(
        String term,
        String academicYear,
        int assessedCount,
        int totalAssessedCount,
        int activeLearnerCount,
        double feePerStudent) {
}