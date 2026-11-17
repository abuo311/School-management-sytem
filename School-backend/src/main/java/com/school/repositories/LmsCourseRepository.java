package com.school.repositories;

import com.school.entities.LmsCourse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LmsCourseRepository extends JpaRepository<LmsCourse, Long> {
    List<LmsCourse> findAllByOrderByCreatedAtDesc();

    List<LmsCourse> findByCreatedByIdOrderByCreatedAtDesc(Long userId);
}
