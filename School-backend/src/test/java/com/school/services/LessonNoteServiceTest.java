package com.school.services;

import com.school.dto.LessonNoteRequest;
import com.school.entities.Role;
import com.school.entities.LessonNote;
import com.school.entities.SchoolClass;
import com.school.entities.Subject;
import com.school.entities.TimetableEntry;
import com.school.entities.User;
import com.school.repositories.LessonNoteRepository;
import com.school.repositories.TimetableEntryRepository;
import com.school.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LessonNoteServiceTest {

    private LessonNoteRepository noteRepository;
    private TimetableEntryRepository timetableRepository;
    private UserRepository userRepository;
    private LessonNoteService service;
    private User teacher;
    private TimetableEntry entry;

    @BeforeEach
    void setUp() {
        noteRepository = mock(LessonNoteRepository.class);
        timetableRepository = mock(TimetableEntryRepository.class);
        userRepository = mock(UserRepository.class);
        service = new LessonNoteService(noteRepository, timetableRepository, userRepository);

        teacher = new User();
        teacher.setId(5L);
        teacher.setUsername("teacher1");
        teacher.setFullName("Teacher One");
        teacher.setRole(Role.TEACHER);

        SchoolClass schoolClass = new SchoolClass();
        schoolClass.setClassName("Primary 3");
        Subject subject = new Subject();
        subject.setName("Mathematics");
        entry = new TimetableEntry();
        entry.setId(9L);
        entry.setSchoolClass(schoolClass);
        entry.setSubject(subject);
        entry.setTeacher(teacher);
        entry.setDayOfWeek("MONDAY");
        entry.setStartTime(LocalTime.of(8, 0));
        entry.setEndTime(LocalTime.of(8, 40));
    }

    @Test
    void teacherCanCreateNoteForAssignedTimetableLesson() {
        LocalDate date = LocalDate.parse("2026-10-05");
        when(userRepository.findByUsername("teacher1")).thenReturn(Optional.of(teacher));
        when(timetableRepository.findById(9L)).thenReturn(Optional.of(entry));
        when(noteRepository.findByTimetableEntryIdAndLessonDate(9L, date)).thenReturn(Optional.empty());
        when(noteRepository.save(any(LessonNote.class))).thenAnswer(invocation -> {
            LessonNote note = invocation.getArgument(0);
            note.setId(10L);
            return note;
        });

        var result = service.create("teacher1", false,
                new LessonNoteRequest(9L, date, "Fractions", "Identify fractions", "Use fraction strips", "Strips",
                        "Page 4"));

        assertEquals("Fractions", result.topic());
        assertEquals("Mathematics", result.subjectName());
        assertEquals("Primary 3", result.className());
    }

    @Test
    void teacherCannotWriteNotesForAnotherTeachersSchedule() {
        LocalDate date = LocalDate.parse("2026-10-05");
        User otherTeacher = new User();
        otherTeacher.setId(6L);
        otherTeacher.setRole(Role.TEACHER);
        entry.setTeacher(otherTeacher);
        when(userRepository.findByUsername("teacher1")).thenReturn(Optional.of(teacher));
        when(timetableRepository.findById(9L)).thenReturn(Optional.of(entry));

        assertThrows(IllegalArgumentException.class, () -> service.create("teacher1", false,
                new LessonNoteRequest(9L, date, "Fractions", "Identify fractions", "Use fraction strips", "", "")));
    }

    @Test
    void rejectsLessonNoteDateThatDoesNotMatchScheduledWeekday() {
        LocalDate tuesday = LocalDate.parse("2026-10-06");
        when(userRepository.findByUsername("teacher1")).thenReturn(Optional.of(teacher));
        when(timetableRepository.findById(9L)).thenReturn(Optional.of(entry));

        assertThrows(IllegalArgumentException.class, () -> service.create("teacher1", false,
                new LessonNoteRequest(9L, tuesday, "Fractions", "Identify fractions", "Use fraction strips", "", "")));
    }
}
