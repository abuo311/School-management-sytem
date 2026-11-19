package com.school.repositories;

import com.school.entities.LmsExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LmsExamAttemptRepository extends JpaRepository<LmsExamAttempt, Long> {
    long countByExamIdAndStudentId(Long examId, Long studentId);

    List<LmsExamAttempt> findByExamIdAndStudentIdOrderByStartedAtDesc(Long examId, Long studentId);

    List<LmsExamAttempt> findByExamIdOrderBySubmittedAtDesc(Long examId);

    List<LmsExamAttempt> findByExamCourseIdOrderBySubmittedAtDesc(Long courseId);

    Optional<LmsExamAttempt> findByIdAndExamId(Long id, Long examId);

    Optional<LmsExamAttempt> findFirstByExamIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(
            Long examId, Long studentId);

    boolean existsByExamId(Long examId);
}
