package com.school.entities;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "grades")
@Data
public class Grade {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    // Matches the "subject" field in your React payload
    private String subject;

    private String term;

    private String academicYear;

    // Scores
    private Double classScore; // Max 30
    private Double examScore;  // Max 70
    private Double totalScore; // Max 100

    // This stores your 1-9 Grade
    private String grade;
}