package com.school.repositories;

import com.school.entities.LmsProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LmsProgressRepository extends JpaRepository<LmsProgress, Long> {
    Optional<LmsProgress> findByUserIdAndLessonId(Long userId, Long lessonId);

    List<LmsProgress> findByUserIdAndLessonCourseId(Long userId, Long courseId);

    void deleteByLessonCourseId(Long courseId);

    void deleteByLessonId(Long lessonId);
}
