package com.school.services;

import com.school.dto.LessonNoteDto;
import com.school.dto.LessonNoteRequest;
import com.school.entities.LessonNote;
import com.school.entities.Role;
import com.school.entities.TimetableEntry;
import com.school.entities.User;
import com.school.repositories.LessonNoteRepository;
import com.school.repositories.TimetableEntryRepository;
import com.school.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LessonNoteService {

    private final LessonNoteRepository noteRepository;
    private final TimetableEntryRepository timetableRepository;
    private final UserRepository userRepository;

    public LessonNoteService(LessonNoteRepository noteRepository, TimetableEntryRepository timetableRepository,
            UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.timetableRepository = timetableRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<LessonNoteDto> list(String username, boolean administrator, LocalDate date) {
        User currentUser = administrator ? null : findTeacher(username);
        List<LessonNote> notes = date == null
                ? noteRepository.findAllByOrderByLessonDateDescUpdatedAtDesc()
                : noteRepository.findByLessonDateOrderByUpdatedAtDesc(date);
        return notes.stream()
                .filter(note -> administrator
                        || note.getTimetableEntry().getTeacher().getId().equals(currentUser.getId()))
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public LessonNoteDto create(String username, boolean administrator, LessonNoteRequest request) {
        validate(request);
        User author = findUser(username);
        TimetableEntry entry = timetableRepository.findById(request.timetableEntryId())
                .orElseThrow(() -> new IllegalArgumentException("Timetable entry was not found."));
        validateScheduledDate(entry, request.lessonDate());
        requireCanEdit(entry, author, administrator);
        LessonNote note = noteRepository.findByTimetableEntryIdAndLessonDate(entry.getId(), request.lessonDate())
                .orElseGet(LessonNote::new);
        if (note.getId() == null) {
            note.setCreatedAt(LocalDateTime.now());
        }
        apply(note, entry, author, request);
        return toDto(noteRepository.save(note));
    }

    @Transactional
    public LessonNoteDto update(Long id, String username, boolean administrator, LessonNoteRequest request) {
        validate(request);
        LessonNote note = noteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lesson note was not found."));
        User author = findUser(username);
        TimetableEntry entry = timetableRepository.findById(request.timetableEntryId())
                .orElseThrow(() -> new IllegalArgumentException("Timetable entry was not found."));
        validateScheduledDate(entry, request.lessonDate());
        requireCanEdit(entry, author, administrator);
        if (!note.getTimetableEntry().getId().equals(entry.getId())
                || !note.getLessonDate().equals(request.lessonDate())) {
            throw new IllegalArgumentException("Edit the existing note without changing its scheduled lesson or date.");
        }
        apply(note, entry, author, request);
        return toDto(noteRepository.save(note));
    }

    @Transactional
    public void delete(Long id, String username, boolean administrator) {
        LessonNote note = noteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lesson note was not found."));
        User author = findUser(username);
        requireCanEdit(note.getTimetableEntry(), author, administrator);
        noteRepository.delete(note);
    }

    private void requireCanEdit(TimetableEntry entry, User currentUser, boolean administrator) {
        if (!administrator && (currentUser.getRole() != Role.TEACHER
                || !entry.getTeacher().getId().equals(currentUser.getId()))) {
            throw new IllegalArgumentException("You can only manage lesson notes for your own timetable.");
        }
    }

    private void validate(LessonNoteRequest request) {
        if (request == null || request.timetableEntryId() == null || request.lessonDate() == null
                || request.topic() == null || request.topic().isBlank()
                || request.learningObjectives() == null || request.learningObjectives().isBlank()
                || request.lessonActivities() == null || request.lessonActivities().isBlank()) {
            throw new IllegalArgumentException(
                    "Scheduled lesson, date, topic, objectives and activities are required.");
        }
    }

    private void validateScheduledDate(TimetableEntry entry, LocalDate date) {
        if (!entry.getDayOfWeek().equalsIgnoreCase(date.getDayOfWeek().name())) {
            throw new IllegalArgumentException("Lesson date must fall on the linked timetable day.");
        }
    }

    private void apply(LessonNote note, TimetableEntry entry, User author, LessonNoteRequest request) {
        note.setTimetableEntry(entry);
        note.setAuthor(author);
        note.setLessonDate(request.lessonDate());
        note.setTopic(request.topic().trim());
        note.setLearningObjectives(request.learningObjectives().trim());
        note.setLessonActivities(request.lessonActivities().trim());
        note.setTeachingResources(cleanOptional(request.teachingResources()));
        note.setHomework(cleanOptional(request.homework()));
        note.setUpdatedAt(LocalDateTime.now());
    }

    private LessonNoteDto toDto(LessonNote note) {
        TimetableEntry entry = note.getTimetableEntry();
        User teacher = entry.getTeacher();
        String teacherName = teacher.getFullName() == null || teacher.getFullName().isBlank()
                ? teacher.getUsername()
                : teacher.getFullName();
        return new LessonNoteDto(note.getId(), entry.getId(), note.getLessonDate(),
                entry.getSchoolClass().getClassName(), entry.getSubject().getName(), teacherName,
                entry.getDayOfWeek(), entry.getStartTime(), entry.getEndTime(), note.getTopic(),
                note.getLearningObjectives(), note.getLessonActivities(), note.getTeachingResources(),
                note.getHomework());
    }

    private User findTeacher(String username) {
        User user = findUser(username);
        if (user.getRole() != Role.TEACHER) {
            throw new IllegalArgumentException("Teacher account was not found.");
        }
        return user;
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Staff account was not found."));
    }

    private String cleanOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}