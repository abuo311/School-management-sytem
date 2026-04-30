package com.school.services;

import com.school.entities.FeePayment;
import com.school.repositories.FeeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FeeService {

    private final FeeRepository feeRepository;

    public FeeService(FeeRepository feeRepository) {
        this.feeRepository = feeRepository;
    }

    @Transactional
    public FeePayment savePayment(FeePayment payment) {
        // 1. SAFETY CHECK: Prevents "return value of getStudent() is null" crash
        if (payment.getStudent() == null || payment.getStudent().getId() == null) {
            throw new RuntimeException("Cannot process payment: No valid student selected.");
        }

        // 2. DUPLICATE PREVENTION LOGIC
        // Fetch history using the validated student ID
        List<FeePayment> history = feeRepository.findByStudentId(payment.getStudent().getId());

        // Check for duplicates (Same student, amount, term, academic year, and day)
        boolean isDuplicate = history.stream().anyMatch(p ->
                p.getAmountPaid() == payment.getAmountPaid() &&
                        p.getTerm() != null && p.getTerm().equalsIgnoreCase(payment.getTerm()) &&
                        p.getAcademicYear() != null && p.getAcademicYear().equalsIgnoreCase(payment.getAcademicYear()) &&
                        p.getDatePaid() != null && p.getDatePaid().equals(LocalDate.now())
        );

        if (isDuplicate) {
            throw new RuntimeException("Duplicate payment detected. This transaction has already been recorded today.");
        }

        // 3. Logic for calculating balance
        double balance = payment.getTotalBill() - payment.getAmountPaid();
        payment.setBalance(balance);

        // 4. Defaults & Safety Checks for database fields
        if (payment.getAcademicYear() == null || payment.getAcademicYear().isEmpty()) {
            payment.setAcademicYear("2025/2026");
        }

        if (payment.getDatePaid() == null) {
            payment.setDatePaid(LocalDate.now());
        }

        if (payment.getReceivedBy() == null || payment.getReceivedBy().isEmpty()) {
            payment.setReceivedBy("Admin");
        }

        return feeRepository.save(payment);
    }

    public List<FeePayment> getFeesByStudent(Long studentId) {
        return feeRepository.findByStudentId(studentId);
    }

    public Map<String, Double> getFinanceSummary(String term) {
        List<FeePayment> allPayments = feeRepository.findAll();

        if (term != null && !term.isEmpty()) {
            allPayments = allPayments.stream()
                    .filter(p -> p.getTerm() != null && p.getTerm().equalsIgnoreCase(term))
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

        List<FeePayment> latestRecords = feeRepository.findAllLatestPayments();
        double totalDebt = latestRecords.stream()
                .filter(p -> term == null || term.isEmpty() || (p.getTerm() != null && p.getTerm().equalsIgnoreCase(term)))
                .mapToDouble(FeePayment::getBalance)
                .sum();

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
        return feeRepository.findById(id).map(existingFee -> {
            existingFee.setTotalBill(updatedDetails.getTotalBill());
            existingFee.setAmountPaid(updatedDetails.getAmountPaid());
            existingFee.setPaymentMethod(updatedDetails.getPaymentMethod());
            existingFee.setTerm(updatedDetails.getTerm());
            existingFee.setAcademicYear(updatedDetails.getAcademicYear());
            existingFee.setReceivedBy(updatedDetails.getReceivedBy());

            double newBalance = updatedDetails.getTotalBill() - updatedDetails.getAmountPaid();
            existingFee.setBalance(newBalance);

            return feeRepository.save(existingFee);
        }).orElseThrow(() -> new RuntimeException("Fee Record not found with id " + id));
    }

    @Transactional
    public void deleteFeeRecord(Long id) {
        feeRepository.deleteById(id);
    }

    public List<FeePayment> getAllLatestStatuses() {
        return feeRepository.findAllLatestPayments();
    }

    public List<FeePayment> getDebtors() {
        return feeRepository.findAllDebtors();
    }
}