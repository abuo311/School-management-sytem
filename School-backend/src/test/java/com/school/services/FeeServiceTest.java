package com.school.services;

import com.school.entities.FeeAssessment;
import com.school.entities.FeePayment;
import com.school.entities.SchoolSettings;
import com.school.entities.Student;
import com.school.repositories.FeeAssessmentRepository;
import com.school.repositories.FeeRepository;
import com.school.repositories.SettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeeServiceTest {

    private FeeRepository feeRepository;
    private SettingsRepository settingsRepository;
    private FeeAssessmentRepository assessmentRepository;
    private FeeService feeService;

    @BeforeEach
    void setUp() {
        feeRepository = mock(FeeRepository.class);
        settingsRepository = mock(SettingsRepository.class);
        assessmentRepository = mock(FeeAssessmentRepository.class);
        feeService = new FeeService(feeRepository, settingsRepository, assessmentRepository);
    }

    @Test
    void excludesArchivedLearnersFromFinanceSummary() {
        SchoolSettings settings = new SchoolSettings();
        settings.setCurrentTerm("Term 1");
        settings.setAcademicYear("2026/2027");
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));

        Student archivedStudent = new Student();
        archivedStudent.setId(7L);
        archivedStudent.setEnabled(false);

        FeePayment historicPayment = new FeePayment();
        historicPayment.setStudent(archivedStudent);
        historicPayment.setAmountPaid(500.0);
        historicPayment.setTerm("Term 1");
        historicPayment.setAcademicYear("2026/2027");
        when(feeRepository.findAll()).thenReturn(List.of(historicPayment));

        FeeAssessment historicAssessment = new FeeAssessment();
        historicAssessment.setStudent(archivedStudent);
        historicAssessment.setTerm("Term 1");
        historicAssessment.setAcademicYear("2026/2027");
        historicAssessment.setAssessedAmount(new BigDecimal("500.00"));
        when(assessmentRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCase("Term 1", "2026/2027"))
                .thenReturn(List.of(historicAssessment));

        Map<String, Double> stats = feeService.getFinanceSummary("");

        assertEquals(0.0, stats.get("collected"));
        assertEquals(0.0, stats.get("debt"));
        assertEquals(0.0, stats.get("expected"));
    }

    @Test
    void recordsCashPaymentAgainstIssuedAssessment() {
        SchoolSettings settings = new SchoolSettings();
        settings.setCurrentTerm("Term 1");
        settings.setAcademicYear("2026/2027");
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));

        Student student = new Student();
        student.setId(42L);
        FeeAssessment assessment = new FeeAssessment();
        assessment.setAssessedAmount(new BigDecimal("500.00"));
        when(assessmentRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 1", "2026/2027")).thenReturn(Optional.of(assessment));
        when(feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 1", "2026/2027")).thenReturn(List.of());
        when(feeRepository.save(any(FeePayment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FeePayment payment = new FeePayment();
        payment.setStudent(student);
        payment.setAmountPaid(125.0);
        payment.setPaymentMethod("Cash");

        FeePayment saved = feeService.savePayment(payment);

        assertEquals(500.0, saved.getTotalBill());
        assertEquals(375.0, saved.getBalance());
        assertEquals("Cash", saved.getPaymentMethod());
        verify(feeRepository).save(payment);
    }

    @Test
    void createsConfiguredAssessmentWhenRecordingCashForUnassessedLearner() {
        SchoolSettings settings = new SchoolSettings();
        settings.setCurrentTerm("Term 1");
        settings.setAcademicYear("2026/2027");
        settings.setNextTermFees(500.0);
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));

        Student student = new Student();
        student.setId(43L);
        when(assessmentRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                43L, "Term 1", "2026/2027")).thenReturn(Optional.empty());
        when(feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                43L, "Term 1", "2026/2027")).thenReturn(List.of());
        when(assessmentRepository.save(any(FeeAssessment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(feeRepository.save(any(FeePayment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FeePayment payment = new FeePayment();
        payment.setStudent(student);
        payment.setAmountPaid(125.0);
        payment.setPaymentMethod("Cash");

        FeePayment saved = feeService.savePayment(payment);

        assertEquals(500.0, saved.getTotalBill());
        assertEquals(375.0, saved.getBalance());
        verify(assessmentRepository).save(any(FeeAssessment.class));
    }
}
