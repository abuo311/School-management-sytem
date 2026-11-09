package com.school.repositories;

import com.school.entities.LessonNoteAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LessonNoteAttachmentRepository extends JpaRepository<LessonNoteAttachment, Long> {
    Optional<LessonNoteAttachment> findByIdAndLessonNoteId(Long id, Long lessonNoteId);
}
