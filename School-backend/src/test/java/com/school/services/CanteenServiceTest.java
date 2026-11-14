package com.school.services;

import com.school.dto.CanteenPaymentDto;
import com.school.dto.CanteenPaymentRequest;
import com.school.entities.CanteenPayment;
import com.school.entities.SchoolSettings;
import com.school.entities.Student;
import com.school.repositories.CanteenPaymentRepository;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CanteenServiceTest {

    private CanteenPaymentRepository paymentRepository;
    private SettingsRepository settingsRepository;
    private StudentRepository studentRepository;
    private CanteenService canteenService;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(CanteenPaymentRepository.class);
        settingsRepository = mock(SettingsRepository.class);
        studentRepository = mock(StudentRepository.class);
        canteenService = new CanteenService(paymentRepository, settingsRepository, studentRepository);
    }

    @Test
    void recordsConfiguredTermlyCanteenPaymentSeparately() {
        SchoolSettings settings = settings();
        Student student = student(42L);
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));
        when(studentRepository.findById(42L)).thenReturn(Optional.of(student));
        when(paymentRepository.findByBillingPeriod("TERMLY:Term 2:2026/2027")).thenReturn(List.of());
        when(paymentRepository.save(any(CanteenPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CanteenPaymentDto saved = canteenService.recordPayment(
                new CanteenPaymentRequest(42L, new BigDecimal("12.50"), "Cash"), "bursar");

        assertEquals(new BigDecimal("12.50"), saved.amountPaid());
        assertEquals("TERMLY:Term 2:2026/2027", saved.billingPeriod());
        assertEquals("Cash", saved.paymentMethod());
        verify(paymentRepository).save(any(CanteenPayment.class));
    }

    @Test
    void rejectsCanteenPaymentAboveCurrentCycleBalance() {
        SchoolSettings settings = settings();
        Student student = student(43L);
        CanteenPayment previousPayment = new CanteenPayment();
        previousPayment.setStudent(student);
        previousPayment.setAmountPaid(new BigDecimal("30.00"));
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));
        when(studentRepository.findById(43L)).thenReturn(Optional.of(student));
        when(paymentRepository.findByBillingPeriod("TERMLY:Term 2:2026/2027"))
                .thenReturn(List.of(previousPayment));

        assertThrows(IllegalArgumentException.class, () -> canteenService.recordPayment(
                new CanteenPaymentRequest(43L, new BigDecimal("6.00"), "Cash"), "bursar"));
    }

    private SchoolSettings settings() {
        SchoolSettings settings = new SchoolSettings();
        settings.setCanteenFeeAmount(35.0);
        settings.setCanteenFeeFrequency("TERMLY");
        settings.setCurrentTerm("Term 2");
        settings.setAcademicYear("2026/2027");
        return settings;
    }

    private Student student(Long id) {
        Student student = new Student();
        student.setId(id);
        student.setFirstName("Ada");
        student.setLastName("Mensah");
        student.setEnabled(true);
        return student;
    }
}
