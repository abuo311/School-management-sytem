package com.school.services;

import com.school.entities.Student;
import com.school.repositories.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StudentServiceTest {

    private StudentRepository studentRepository;
    private StudentService studentService;

    @BeforeEach
    void setUp() {
        studentRepository = mock(StudentRepository.class);
        studentService = new StudentService();
        ReflectionTestUtils.setField(studentService, "studentRepository", studentRepository);
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
        student.setAdmissionNumber("ADM-" + LocalDate.now().getYear() + "-0001");
        when(studentRepository.existsByAdmissionNumber(student.getAdmissionNumber())).thenReturn(true);
        when(studentRepository.count()).thenReturn(1L);
        when(studentRepository.existsByAdmissionNumber("ADM-" + LocalDate.now().getYear() + "-0002"))
                .thenReturn(false);

        studentService.saveStudent(student);

        assertEquals("ADM-" + LocalDate.now().getYear() + "-0002", student.getAdmissionNumber());
        verify(studentRepository).save(student);
    }
}