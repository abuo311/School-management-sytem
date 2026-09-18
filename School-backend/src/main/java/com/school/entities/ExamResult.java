package com.school.entities;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "exam_results")
@Data
public class ExamResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    private String subject;
    private String term;
    private String academicYear;

    private double classScore; // Weighted score, max 30
    private double examScore;  // Weighted score, max 70
    private Double rawClassScore; // Raw class score, max 50
    private Double rawExamScore; // Raw exam score, max 100
    private double totalScore; // Sum of class + exam
    private String grade;      // Now stores 1-9
    private String remarks;    // e.g., Excellent, Credit

    // Added these for the Ranking/Report features later
    private Integer position;
    private Integer classSize;
}