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

    private double classScore; // Max 30
    private double examScore;  // Max 70
    private double totalScore; // Sum of class + exam
    private String grade;      // Now stores 1-9
    private String remarks;    // e.g., Excellent, Credit

    // Added these for the Ranking/Report features later
    private Integer position;
    private Integer classSize;
}