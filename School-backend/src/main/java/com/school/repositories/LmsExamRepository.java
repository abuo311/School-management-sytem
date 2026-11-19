package com.school.repositories;

import com.school.entities.LmsExam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LmsExamRepository extends JpaRepository<LmsExam, Long> {
    List<LmsExam> findByCourseIdOrderByIdAsc(Long courseId);

    Optional<LmsExam> findByIdAndCourseId(Long id, Long courseId);
}
