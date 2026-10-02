package com.school.services;

import com.school.entities.FeePayment;
import com.school.entities.SchoolSettings;
import com.school.entities.FeeAssessment;
import com.school.repositories.FeeRepository;
import com.school.repositories.FeeAssessmentRepository;
import com.school.repositories.SettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class FeeService {

    private final FeeRepository feeRepository;
    private final SettingsRepository settingsRepository;
    private final FeeAssessmentRepository assessmentRepository;

    public FeeService(FeeRepository feeRepository, SettingsRepository settingsRepository,
            FeeAssessmentRepository assessmentRepository) {
        this.feeRepository = feeRepository;
        this.settingsRepository = settingsRepository;
        this.assessmentRepository = assessmentRepository;
    }

    @Transactional
    public FeePayment savePayment(FeePayment payment) {
        if (payment.getStudent() == null || payment.getStudent().getId() == null) {
            throw new RuntimeException("Cannot process payment: No valid student selected.");
        }
        SchoolSettings settings = settingsRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new IllegalArgumentException("School fee settings are not configured."));
        String term = settings.getCurrentTerm();
        String academicYear = settings.getAcademicYear();
        if (term == null || academicYear == null) {
            throw new IllegalArgumentException("Set the current term and academic year before recording payments.");
        }
        FeeAssessment assessment = assessmentRepository
                .findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                        payment.getStudent().getId(), term, academicYear)
                .orElseGet(() -> createCurrentAssessment(payment, settings, term, academicYear));
        if (!Double.isFinite(payment.getAmountPaid()) || payment.getAmountPaid() <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero.");
        }

        List<FeePayment> history = feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                payment.getStudent().getId(), term, academicYear);
        double previousPayments = history.stream()
                .mapToDouble(existingPayment -> existingPayment != null ? existingPayment.getAmountPaid() : 0d)
                .sum();
        double assessedAmount = assessment.getAssessedAmount().doubleValue();
        double balance = Math.max(0, assessedAmount - previousPayments - payment.getAmountPaid());
        if (payment.getAmountPaid() > assessedAmount - previousPayments) {
            throw new IllegalArgumentException("Payment exceeds the outstanding balance.");
        }
        payment.setTerm(term);
        payment.setAcademicYear(academicYear);
        payment.setTotalBill(assessedAmount);
        payment.setBalance(balance);
        payment.setDatePaid(LocalDate.now());
        payment.setReceivedBy("Admin");

        return feeRepository.save(payment);
    }

    private FeeAssessment createCurrentAssessment(FeePayment payment, SchoolSettings settings,
            String term, String academicYear) {
        List<FeePayment> existingPayments = feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                payment.getStudent().getId(), term, academicYear);
        double legacyBill = existingPayments.stream()
                .filter(existing -> existing != null && Double.isFinite(existing.getTotalBill()))
                .mapToDouble(existing -> existing == null ? 0d : existing.getTotalBill())
                .filter(amount -> amount > 0)
                .max()
                .orElse(0);
        double configuredFee = settings.getNextTermFees() == null ? 0 : settings.getNextTermFees();
        double assessedFee = legacyBill > 0 ? legacyBill : configuredFee;
        if (!Double.isFinite(assessedFee) || assessedFee <= 0) {
            throw new IllegalArgumentException(
                    "No term fee is configured. Set and save Termly Fees before recording a payment.");
        }

        FeeAssessment newAssessment = new FeeAssessment();
        newAssessment.setStudent(payment.getStudent());
        newAssessment.setTerm(term);
        newAssessment.setAcademicYear(academicYear);
        newAssessment.setAssessedAmount(java.math.BigDecimal.valueOf(assessedFee)
                .setScale(2, java.math.RoundingMode.HALF_UP));
        newAssessment.setIssuedAt(java.time.LocalDateTime.now());
        return assessmentRepository.save(newAssessment);
    }

    public List<FeePayment> getFeesByStudent(Long studentId) {
        return feeRepository.findByStudentId(studentId);
    }

    public double getCurrentBalance(Long studentId, String term, String academicYear) {
        var assessment = assessmentRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                studentId, term, academicYear);
        List<FeePayment> payments = feeRepository
                .findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(studentId, term, academicYear);
        double totalBill = assessment.map(item -> item.getAssessedAmount().doubleValue())
                .orElseGet(() -> payments.stream()
                        .mapToDouble(p -> p != null ? p.getTotalBill() : 0d)
                        .filter(bill -> bill > 0)
                        .max()
                        .orElse(0));
        double totalPaid = payments.stream().mapToDouble(p -> p != null ? p.getAmountPaid() : 0d).sum();
        return Math.max(0, totalBill - totalPaid);
    }

    public Map<String, Double> getFinanceSummary(String term) {
        List<FeePayment> allPayments = feeRepository.findAll().stream()
                .filter(payment -> payment != null && payment.getStudent() != null
                        && payment.getStudent().isEnabled())
                .toList();
        SchoolSettings settings = settingsRepository.findFirstByOrderByIdAsc().orElse(null);
        String selectedTerm = term == null || term.isBlank()
                ? settings == null ? null : settings.getCurrentTerm()
                : term;
        String selectedYear = settings == null ? null : settings.getAcademicYear();

        if (selectedTerm != null) {
            allPayments = allPayments.stream()
                    .filter(p -> p.getTerm() != null && p.getTerm().equalsIgnoreCase(selectedTerm))
                    .filter(p -> selectedYear == null || p.getAcademicYear() != null
                            && p.getAcademicYear().equalsIgnoreCase(selectedYear))
                    .toList();
        }

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        double totalCollected = 0;
        double todayCollection = 0;
        double yesterdayCollection = 0;

        for (FeePayment p : allPayments) {
            double paid = p.getAmountPaid();
            totalCollected += paid;

            if (p.getDatePaid() != null) {
                if (p.getDatePaid().equals(today)) {
                    todayCollection += paid;
                } else if (p.getDatePaid().equals(yesterday)) {
                    yesterdayCollection += paid;
                }
            }
        }

        double totalDebt = 0;
        if (selectedTerm != null && selectedYear != null) {
            totalDebt = assessmentRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCase(selectedTerm, selectedYear)
                    .stream()
                    .filter(assessment -> assessment != null && assessment.getStudent() != null
                            && assessment.getStudent().isEnabled())
                    .mapToDouble(assessment -> {
                        double paid = feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                                assessment.getStudent().getId(), selectedTerm, selectedYear)
                                .stream().mapToDouble(payment -> payment != null ? payment.getAmountPaid() : 0d).sum();
                        return Math.max(0, assessment.getAssessedAmount().doubleValue() - paid);
                    })
                    .sum();
        }

        Map<String, Double> stats = new HashMap<>();
        stats.put("expected", totalCollected + totalDebt);
        stats.put("collected", totalCollected);
        stats.put("debt", totalDebt);
        stats.put("todayCollection", todayCollection);
        stats.put("yesterdayCollection", yesterdayCollection);

        return stats;
    }

    @Transactional
    public FeePayment updateFeeRecord(Long id, FeePayment updatedDetails) {
        Long paymentId = Objects.requireNonNull(id, "Fee id must not be null");

        return feeRepository.findById(paymentId).map(existingFee -> {
            existingFee.setTotalBill(updatedDetails.getTotalBill());
            existingFee.setAmountPaid(updatedDetails.getAmountPaid());
            existingFee.setPaymentMethod(updatedDetails.getPaymentMethod());
            existingFee.setTerm(updatedDetails.getTerm());
            existingFee.setAcademicYear(updatedDetails.getAcademicYear());
            existingFee.setReceivedBy(updatedDetails.getReceivedBy());

            double newBalance = updatedDetails.getTotalBill() - updatedDetails.getAmountPaid();
            existingFee.setBalance(newBalance);

            return feeRepository.save(existingFee);
        }).orElseThrow(() -> new RuntimeException("Fee Record not found with id " + paymentId));
    }

    @Transactional
    public void deleteFeeRecord(Long id) {
        Long paymentId = Objects.requireNonNull(id, "Fee id must not be null");
        FeePayment payment = feeRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment record not found with id " + paymentId));

        if (payment.getStudent() != null && payment.getStudent().getFeeHistory() != null) {
            payment.getStudent().getFeeHistory().removeIf(existing -> id.equals(existing.getId()));
        }

        feeRepository.delete(payment);
        feeRepository.flush();
    }

    public List<FeePayment> getAllLatestStatuses() {
        return feeRepository.findAllLatestPayments();
    }

    public List<FeePayment> getDebtors() {
        return feeRepository.findAllDebtors();
    }
}