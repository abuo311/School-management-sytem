package com.school.repositories;

import com.school.entities.LessonNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LessonNoteRepository extends JpaRepository<LessonNote, Long> {
    boolean existsByTimetableEntryId(Long timetableEntryId);

    Optional<LessonNote> findByTimetableEntryIdAndLessonDate(Long timetableEntryId, LocalDate lessonDate);

    List<LessonNote> findByLessonDateOrderByUpdatedAtDesc(LocalDate lessonDate);

    List<LessonNote> findAllByOrderByLessonDateDescUpdatedAtDesc();
}