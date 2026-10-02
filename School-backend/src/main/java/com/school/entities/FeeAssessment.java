package com.school.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "fee_assessments", uniqueConstraints = @UniqueConstraint(name = "uk_fee_assessment_student_cycle", columnNames = {
        "student_id", "term", "academic_year" }))
public class FeeAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false, length = 40)
    private String term;

    @Column(name = "academic_year", nullable = false, length = 20)
    private String academicYear;

    @Column(name = "assessed_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal assessedAmount;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;
}