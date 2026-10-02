package com.school.repositories;

import com.school.entities.FeeAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeeAssessmentRepository extends JpaRepository<FeeAssessment, Long> {

    List<FeeAssessment> findByTermIgnoreCaseAndAcademicYearIgnoreCase(String term, String academicYear);

    Optional<FeeAssessment> findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
            Long studentId, String term, String academicYear);

    boolean existsByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
            Long studentId, String term, String academicYear);
}