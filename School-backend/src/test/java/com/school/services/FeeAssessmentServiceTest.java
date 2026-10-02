package com.school.services;

import com.school.dto.FeeBalanceDto;
import com.school.entities.FeeAssessment;
import com.school.entities.FeePayment;
import com.school.entities.SchoolSettings;
import com.school.entities.Student;
import com.school.repositories.FeeAssessmentRepository;
import com.school.repositories.FeeRepository;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeeAssessmentServiceTest {

    private FeeAssessmentRepository assessmentRepository;
    private FeeRepository feeRepository;
    private StudentRepository studentRepository;
    private SettingsRepository settingsRepository;
    private FeeAssessmentService service;
    private Student student;

    @BeforeEach
    void setUp() {
        assessmentRepository = mock(FeeAssessmentRepository.class);
        feeRepository = mock(FeeRepository.class);
        studentRepository = mock(StudentRepository.class);
        settingsRepository = mock(SettingsRepository.class);
        service = new FeeAssessmentService(
                assessmentRepository, feeRepository, studentRepository, settingsRepository);

        SchoolSettings settings = new SchoolSettings();
        settings.setCurrentTerm("Term 2");
        settings.setAcademicYear("2026/2027");
        settings.setNextTermFees(650.0);
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));

        student = new Student();
        student.setId(42L);
        student.setFirstName("Ama");
        student.setLastName("Mensah");
        student.setAdmissionNumber("ADM-42");
        student.setEnabled(true);
    }

    @Test
    void issuesConfiguredFeeOnceForEachActiveLearner() {
        when(studentRepository.findAllByEnabledTrue()).thenReturn(List.of(student));
        when(assessmentRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(Optional.empty());
        when(feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(List.of());
        FeeAssessment assessment = new FeeAssessment();
        assessment.setStudent(student);
        assessment.setAssessedAmount(new BigDecimal("650.00"));
        when(assessmentRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCase("Term 2", "2026/2027"))
                .thenReturn(List.of(assessment));

        var response = service.issueCurrentTermFees();

        assertEquals(1, response.assessedCount());
        assertEquals(1, response.totalAssessedCount());
        assertEquals(1, response.activeLearnerCount());
        assertEquals(650.0, response.feePerStudent());
        verify(assessmentRepository).save(any(FeeAssessment.class));
    }

    @Test
    void doesNotIssueDuplicateAssessmentForCycle() {
        when(studentRepository.findAllByEnabledTrue()).thenReturn(List.of(student));
        FeeAssessment existing = new FeeAssessment();
        existing.setAssessedAmount(new BigDecimal("650.00"));
        when(assessmentRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(Optional.of(existing));
        existing.setStudent(student);
        when(assessmentRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCase("Term 2", "2026/2027"))
                .thenReturn(List.of(existing));

        var response = service.issueCurrentTermFees();

        assertEquals(0, response.assessedCount());
        assertEquals(1, response.totalAssessedCount());
        assertEquals(1, response.activeLearnerCount());
        verify(assessmentRepository, never()).save(any(FeeAssessment.class));
    }

    @Test
    void reportsFullBalanceForLearnerWhoHasNotPaid() {
        FeeAssessment assessment = new FeeAssessment();
        assessment.setStudent(student);
        assessment.setTerm("Term 2");
        assessment.setAcademicYear("2026/2027");
        assessment.setAssessedAmount(new BigDecimal("650.00"));
        when(assessmentRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCase("Term 2", "2026/2027"))
                .thenReturn(List.of(assessment));
        when(studentRepository.findAllByEnabledTrue()).thenReturn(List.of(student));
        when(assessmentRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(Optional.of(assessment));
        when(feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(List.of());

        List<FeeBalanceDto> balances = service.getBalances("Term 2", "2026/2027", true);

        assertEquals(1, balances.size());
        assertEquals(new BigDecimal("650.00"), balances.get(0).balance());
        assertEquals(new BigDecimal("0"), balances.get(0).totalPaid());
        assertEquals("Ama", balances.get(0).student().firstName());
    }

    @Test
    void debtorReadCreatesAssessmentForUnpaidLearner() {
        when(studentRepository.findAllByEnabledTrue()).thenReturn(List.of(student));
        when(assessmentRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(Optional.empty());
        when(feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(List.of());
        FeeAssessment created = new FeeAssessment();
        created.setStudent(student);
        created.setAssessedAmount(new BigDecimal("650.00"));
        when(assessmentRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCase("Term 2", "2026/2027"))
                .thenReturn(List.of(created));

        List<FeeBalanceDto> balances = service.getBalances(null, null, true);

        assertEquals(1, balances.size());
        assertEquals(new BigDecimal("650.00"), balances.get(0).balance());
        verify(assessmentRepository).save(any(FeeAssessment.class));
    }

    @Test
    void backfillsLegacyTermBillInsteadOfReplacingItWithCurrentDefault() {
        when(studentRepository.findAllByEnabledTrue()).thenReturn(List.of(student));
        when(assessmentRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(Optional.empty());
        FeePayment legacyPayment = new FeePayment();
        legacyPayment.setTotalBill(500.0);
        legacyPayment.setAmountPaid(125.0);
        when(feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(List.of(legacyPayment));

        service.ensureCurrentTermAssessments();

        var captor = org.mockito.ArgumentCaptor.forClass(FeeAssessment.class);
        verify(assessmentRepository).save(captor.capture());
        assertEquals(new BigDecimal("500.00"), captor.getValue().getAssessedAmount());
    }
}