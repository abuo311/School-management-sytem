package com.school.repositories;

import com.school.entities.LmsLessonImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LmsLessonImageRepository extends JpaRepository<LmsLessonImage, Long> {
    List<LmsLessonImage> findByLessonIdOrderByIdAsc(Long lessonId);

    Optional<LmsLessonImage> findByIdAndLessonId(Long id, Long lessonId);

    void deleteByLessonId(Long lessonId);

    void deleteByLessonCourseId(Long courseId);
}
