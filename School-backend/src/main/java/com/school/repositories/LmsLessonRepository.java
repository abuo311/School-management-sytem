package com.school.repositories;

import com.school.entities.LmsLesson;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LmsLessonRepository extends JpaRepository<LmsLesson, Long> {
    List<LmsLesson> findByCourseIdOrderByPositionAscIdAsc(Long courseId);

    void deleteByCourseId(Long courseId);
}
