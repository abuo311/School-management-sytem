package com.school.services;

import com.school.dto.FeeBalanceDto;
import com.school.dto.FeeBalanceStudentDto;
import com.school.dto.IssueFeesResponse;
import com.school.entities.FeeAssessment;
import com.school.entities.FeePayment;
import com.school.entities.SchoolSettings;
import com.school.entities.Student;
import com.school.repositories.FeeAssessmentRepository;
import com.school.repositories.FeeRepository;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class FeeAssessmentService {

    private final FeeAssessmentRepository assessmentRepository;
    private final FeeRepository feeRepository;
    private final StudentRepository studentRepository;
    private final SettingsRepository settingsRepository;

    public FeeAssessmentService(FeeAssessmentRepository assessmentRepository, FeeRepository feeRepository,
            StudentRepository studentRepository, SettingsRepository settingsRepository) {
        this.assessmentRepository = assessmentRepository;
        this.feeRepository = feeRepository;
        this.studentRepository = studentRepository;
        this.settingsRepository = settingsRepository;
    }

    @Transactional
    public IssueFeesResponse issueCurrentTermFees() {
        SchoolSettings settings = currentSettings();
        String term = requireValue(settings.getCurrentTerm(), "Current term is not configured.");
        String year = requireValue(settings.getAcademicYear(), "Academic year is not configured.");
        BigDecimal configuredAmount = configuredAmount(settings);
        if (configuredAmount.signum() <= 0 && !hasLegacyBills(term, year)) {
            throw new IllegalArgumentException("Set a positive term fee in Settings before issuing fees.");
        }
        int issued = ensureAssessments(term, year, configuredAmount);
        int activeLearners = studentRepository.findAllByEnabledTrue().size();
        int totalAssessed = (int) assessmentRepository
                .findByTermIgnoreCaseAndAcademicYearIgnoreCase(term, year).stream()
                .filter(assessment -> assessment.getStudent() != null && assessment.getStudent().isEnabled())
                .count();
        return new IssueFeesResponse(term, year, issued, totalAssessed, activeLearners,
                configuredAmount.doubleValue());
    }

    @Transactional
    public int ensureCurrentTermAssessments() {
        SchoolSettings settings = currentSettings();
        if (settings.getCurrentTerm() == null || settings.getAcademicYear() == null) {
            return 0;
        }
        return ensureAssessments(settings.getCurrentTerm(), settings.getAcademicYear(), configuredAmount(settings));
    }

    private int ensureAssessments(String term, String year, BigDecimal configuredAmount) {
        int issued = 0;
        for (Student student : studentRepository.findAllByEnabledTrue()) {
            if (!student.isEnabled() || assessmentRepository
                    .findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(student.getId(), term, year)
                    .isPresent()) {
                continue;
            }

            List<FeePayment> payments = feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                    student.getId(), term, year);
            BigDecimal legacyBill = payments.stream()
                    .filter(payment -> payment != null && Double.isFinite(payment.getTotalBill())
                            && payment.getTotalBill() > 0)
                    .map(payment -> BigDecimal.valueOf(payment.getTotalBill()))
                    .max((first, second) -> first.compareTo(second))
                    .orElse(BigDecimal.ZERO);
            BigDecimal amount = legacyBill.signum() > 0 ? legacyBill : configuredAmount;
            if (amount.signum() <= 0) {
                continue;
            }

            FeeAssessment assessment = new FeeAssessment();
            assessment.setStudent(student);
            assessment.setTerm(term);
            assessment.setAcademicYear(year);
            assessment.setAssessedAmount(amount.setScale(2, RoundingMode.HALF_UP));
            assessment.setIssuedAt(LocalDateTime.now());
            assessmentRepository.save(assessment);
            issued++;
        }
        return issued;
    }

    private boolean hasLegacyBills(String term, String year) {
        return studentRepository.findAllByEnabledTrue().stream()
                .filter(student -> student != null)
                .map(student -> feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                        student.getId(), term, year))
                .filter(payments -> payments != null)
                .flatMap(payments -> payments.stream())
                .anyMatch(payment -> payment != null && Double.isFinite(payment.getTotalBill())
                        && payment.getTotalBill() > 0);
    }

    private BigDecimal configuredAmount(SchoolSettings settings) {
        return BigDecimal.valueOf(settings.getNextTermFees() == null ? 0 : settings.getNextTermFees())
                .setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public List<FeeBalanceDto> getBalances(String term, String academicYear, boolean debtorsOnly) {
        SchoolSettings settings = currentSettings();
        String selectedTerm = term == null || term.isBlank() ? settings.getCurrentTerm() : term;
        String selectedYear = academicYear == null || academicYear.isBlank()
                ? settings.getAcademicYear()
                : academicYear;
        if (selectedTerm == null || selectedYear == null) {
            return List.of();
        }

        if (selectedTerm.equalsIgnoreCase(settings.getCurrentTerm() == null ? "" : settings.getCurrentTerm())
                && selectedYear
                        .equalsIgnoreCase(settings.getAcademicYear() == null ? "" : settings.getAcademicYear())) {
            ensureAssessments(selectedTerm, selectedYear, configuredAmount(settings));
        }

        return assessmentRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCase(selectedTerm, selectedYear).stream()
                .map(assessment -> toBalance(assessment, selectedTerm, selectedYear))
                .filter(balance -> !debtorsOnly || balance.balance().signum() > 0)
                .toList();
    }

    @Transactional(readOnly = true)
    public FeeBalanceDto getStudentBalance(Long studentId, String term, String academicYear) {
        FeeAssessment assessment = assessmentRepository
                .findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(studentId, term, academicYear)
                .orElse(null);
        if (assessment == null) {
            return null;
        }
        return toBalance(assessment, term, academicYear);
    }

    @Transactional(readOnly = true)
    public BigDecimal getAssessedAmount(Long studentId, String term, String academicYear) {
        return assessmentRepository
                .findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(studentId, term, academicYear)
                .map(assessment -> assessment.getAssessedAmount())
                .orElse(BigDecimal.ZERO);
    }

    @Transactional(readOnly = true)
    public double getActiveLearnerOutstandingTotal() {
        return assessmentRepository.findAll().stream()
                .filter(assessment -> assessment.getStudent() != null && assessment.getStudent().isEnabled())
                .mapToDouble(assessment -> {
                    List<FeePayment> payments = feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                            assessment.getStudent().getId(), assessment.getTerm(), assessment.getAcademicYear());
                    double paid = payments.stream()
                            .mapToDouble(payment -> payment == null ? 0d : payment.getAmountPaid())
                            .sum();
                    return Math.max(0, assessment.getAssessedAmount().doubleValue() - paid);
                })
                .sum();
    }

    private FeeBalanceDto toBalance(FeeAssessment assessment, String term, String year) {
        List<FeePayment> payments = feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                assessment.getStudent().getId(), term, year);
        BigDecimal paid = payments.stream()
                .map(payment -> BigDecimal.valueOf(payment.getAmountPaid()))
                .reduce(BigDecimal.ZERO, (total, amount) -> total.add(amount));
        BigDecimal assessed = assessment.getAssessedAmount();
        BigDecimal balance = assessed.subtract(paid).max(BigDecimal.ZERO);
        Student student = assessment.getStudent();
        FeeBalanceStudentDto studentSummary = new FeeBalanceStudentDto(
                student.getId(), student.getFirstName(), student.getLastName(), student.getAdmissionNumber(),
                student.getGradeLevel(), student.getParentContact(), student.getParentEmail());
        return new FeeBalanceDto(studentSummary, term, year, assessed, paid, balance);
    }

    private SchoolSettings currentSettings() {
        return settingsRepository.findFirstByOrderByIdAsc().orElseGet(SchoolSettings::new);
    }

    private String requireValue(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }
}