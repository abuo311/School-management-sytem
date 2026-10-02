package com.school.services;

import com.school.dto.TimetableEntryRequest;
import com.school.entities.Role;
import com.school.entities.SchoolClass;
import com.school.entities.SchoolSettings;
import com.school.entities.Subject;
import com.school.entities.TimetableEntry;
import com.school.entities.User;
import com.school.repositories.ClassRepository;
import com.school.repositories.LessonNoteRepository;
import com.school.repositories.SettingsRepository;
import com.school.repositories.SubjectRepository;
import com.school.repositories.TimetableEntryRepository;
import com.school.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TimetableServiceTest {

    private TimetableEntryRepository timetableRepository;
    private ClassRepository classRepository;
    private SubjectRepository subjectRepository;
    private UserRepository userRepository;
    private SettingsRepository settingsRepository;
    private LessonNoteRepository lessonNoteRepository;
    private TimetableService service;
    private SchoolClass schoolClass;
    private Subject subject;
    private User teacher;

    @BeforeEach
    void setUp() {
        timetableRepository = mock(TimetableEntryRepository.class);
        classRepository = mock(ClassRepository.class);
        subjectRepository = mock(SubjectRepository.class);
        userRepository = mock(UserRepository.class);
        settingsRepository = mock(SettingsRepository.class);
        lessonNoteRepository = mock(LessonNoteRepository.class);
        service = new TimetableService(timetableRepository, classRepository, subjectRepository,
                userRepository, settingsRepository, lessonNoteRepository);

        SchoolSettings settings = new SchoolSettings();
        settings.setCurrentTerm("Term 1");
        settings.setAcademicYear("2026/2027");
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));

        schoolClass = new SchoolClass();
        schoolClass.setId(3L);
        schoolClass.setClassName("Primary 3");
        subject = new Subject();
        subject.setId(4L);
        subject.setName("Mathematics");
        teacher = new User();
        teacher.setId(5L);
        teacher.setUsername("teacher1");
        teacher.setFullName("Teacher One");
        teacher.setRole(Role.TEACHER);
        teacher.setEnabled(true);
    }

    @Test
    void createsTimetableEntryForSettingsCycle() {
        when(classRepository.findById(3L)).thenReturn(Optional.of(schoolClass));
        when(subjectRepository.findById(4L)).thenReturn(Optional.of(subject));
        when(userRepository.findById(5L)).thenReturn(Optional.of(teacher));
        when(timetableRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
                "Term 1", "2026/2027")).thenReturn(List.of());
        when(timetableRepository.save(any(TimetableEntry.class))).thenAnswer(invocation -> {
            TimetableEntry entry = invocation.getArgument(0);
            entry.setId(9L);
            return entry;
        });

        var result = service.create(new TimetableEntryRequest(3L, 4L, 5L,
                "monday", LocalTime.of(8, 0), LocalTime.of(8, 40), "Room 2"));

        assertEquals("Term 1", result.term());
        assertEquals("2026/2027", result.academicYear());
        assertEquals("MONDAY", result.dayOfWeek());
        assertEquals("Primary 3", result.className());
    }

    @Test
    void rejectsOverlappingClassOrTeacherSlot() {
        when(classRepository.findById(3L)).thenReturn(Optional.of(schoolClass));
        when(subjectRepository.findById(4L)).thenReturn(Optional.of(subject));
        when(userRepository.findById(5L)).thenReturn(Optional.of(teacher));
        TimetableEntry existing = new TimetableEntry();
        existing.setId(8L);
        existing.setSchoolClass(schoolClass);
        existing.setTeacher(teacher);
        existing.setDayOfWeek("MONDAY");
        existing.setStartTime(LocalTime.of(8, 30));
        existing.setEndTime(LocalTime.of(9, 0));
        when(timetableRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
                "Term 1", "2026/2027")).thenReturn(List.of(existing));

        assertThrows(IllegalArgumentException.class, () -> service.create(new TimetableEntryRequest(
                3L, 4L, 5L, "MONDAY", LocalTime.of(8, 0), LocalTime.of(8, 45), "Room 2")));
    }
}
