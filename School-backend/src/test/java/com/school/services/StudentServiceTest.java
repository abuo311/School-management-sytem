package com.school.services;

import com.school.entities.Student;
import com.school.entities.SchoolSettings;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StudentServiceTest {

    private StudentRepository studentRepository;
    private SettingsRepository settingsRepository;
    private StudentService studentService;

    @BeforeEach
    void setUp() {
        studentRepository = mock(StudentRepository.class);
        settingsRepository = mock(SettingsRepository.class);
        studentService = new StudentService();
        ReflectionTestUtils.setField(studentService, "studentRepository", studentRepository);
        ReflectionTestUtils.setField(studentService, "settingsRepository", settingsRepository);
    }

    @Test
    void archivesStudentAndPreservesForeignKeyHistory() {
        Student student = new Student();
        student.setId(51L);
        student.setEnabled(true);
        when(studentRepository.findById(51L)).thenReturn(Optional.of(student));

        studentService.archiveStudent(51L);

        assertFalse(student.isEnabled());
        verify(studentRepository).save(student);
        verify(studentRepository, never()).deleteById(51L);
    }

    @Test
    void replacesDuplicateAdmissionNumberSubmittedForNewStudent() {
        Student student = new Student();
        student.setAdmissionNumber("PPS-0001");
        when(studentRepository.existsByAdmissionNumber(student.getAdmissionNumber())).thenReturn(true);
        when(settingsRepository.findFirstByOrderByIdAsc())
                .thenReturn(Optional.of(settingsWithStudentIdPrefix("PPS")));
        when(studentRepository.countByAdmissionNumberStartingWith("PPS-")).thenReturn(1L);
        when(studentRepository.existsByAdmissionNumber("PPS-0002"))
                .thenReturn(false);

        studentService.saveStudent(student);

        assertEquals("PPS-0002", student.getAdmissionNumber());
        verify(studentRepository).save(student);
    }

    @Test
    void generatesAdmissionNumberUsingConfiguredPrefix() {
        Student student = new Student();
        when(settingsRepository.findFirstByOrderByIdAsc())
                .thenReturn(Optional.of(settingsWithStudentIdPrefix("SCH")));
        when(studentRepository.countByAdmissionNumberStartingWith("SCH-")).thenReturn(0L);
        when(studentRepository.existsByAdmissionNumber("SCH-0001")).thenReturn(false);

        studentService.saveStudent(student);

        assertEquals("SCH-0001", student.getAdmissionNumber());
    }

    @Test
    void startsNewPrefixSequenceAtOneEvenWhenOtherPrefixesExist() {
        Student student = new Student();
        when(settingsRepository.findFirstByOrderByIdAsc())
                .thenReturn(Optional.of(settingsWithStudentIdPrefix("PPS")));
        when(studentRepository.countByAdmissionNumberStartingWith("PPS-")).thenReturn(0L);
        when(studentRepository.existsByAdmissionNumber("PPS-0001")).thenReturn(false);

        studentService.saveStudent(student);

        assertEquals("PPS-0001", student.getAdmissionNumber());
    }

    private SchoolSettings settingsWithStudentIdPrefix(String prefix) {
        SchoolSettings settings = new SchoolSettings();
        settings.setStudentIdPrefix(prefix);
        return settings;
    }
}