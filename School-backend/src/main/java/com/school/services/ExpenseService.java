package com.school.services;

import com.school.dto.AccountSummaryDto;
import com.school.dto.ExpenseRequest;
import com.school.entities.Expense;
import com.school.entities.PayrollStatus;
import com.school.repositories.CanteenPaymentRepository;
import com.school.repositories.ExpenseRepository;
import com.school.repositories.FeeRepository;
import com.school.repositories.PayrollRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ExpenseService {

    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

    private final ExpenseRepository expenseRepository;
    private final FeeRepository feeRepository;
    private final CanteenPaymentRepository canteenPaymentRepository;
    private final PayrollRecordRepository payrollRecordRepository;

    public ExpenseService(
            ExpenseRepository expenseRepository,
            FeeRepository feeRepository,
            CanteenPaymentRepository canteenPaymentRepository,
            PayrollRecordRepository payrollRecordRepository) {
        this.expenseRepository = expenseRepository;
        this.feeRepository = feeRepository;
        this.canteenPaymentRepository = canteenPaymentRepository;
        this.payrollRecordRepository = payrollRecordRepository;
    }

    @Transactional(readOnly = true)
    public List<Expense> getExpenses() {
        return expenseRepository.findAllByOrderByExpenseDateDescIdDesc();
    }

    @Transactional
    public Expense create(ExpenseRequest request, String recordedBy) {
        validate(request);
        Expense expense = new Expense();
        expense.setRecordedBy(requiredText(recordedBy, "Recorder", 100));
        applyRequest(expense, request);
        return expenseRepository.save(expense);
    }

    @Transactional
    public Expense update(Long id, ExpenseRequest request) {
        validate(request);
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Expense record not found."));
        applyRequest(expense, request);
        return expenseRepository.save(expense);
    }

    @Transactional
    public void delete(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Expense record not found."));
        expenseRepository.delete(expense);
    }

    @Transactional(readOnly = true)
    public AccountSummaryDto getAccountSummary() {
        BigDecimal fees = amount(feeRepository.sumAllCollectedFees());
        BigDecimal canteen = amount(canteenPaymentRepository.sumAllPayments());
        BigDecimal recordedExpenses = amount(expenseRepository.sumAllExpenses());
        BigDecimal payroll = amount(payrollRecordRepository.sumNetPayByStatus(PayrollStatus.PAID));
        BigDecimal totalIncome = fees.add(canteen);
        BigDecimal totalSpent = recordedExpenses.add(payroll);
        return new AccountSummaryDto(
                fees, canteen, totalIncome, recordedExpenses, payroll, totalSpent, totalIncome.subtract(totalSpent));
    }

    private void validate(ExpenseRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Expense details are required.");
        }
        requiredText(request.category(), "Category", 50);
        requiredText(request.description(), "Description", 200);
        requiredText(request.paymentMethod(), "Payment method", 50);
        if (request.amount() == null || request.amount().signum() <= 0) {
            throw new IllegalArgumentException("Expense amount must be greater than zero.");
        }
        if (request.amount().stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException("Expense amount can have at most two decimal places.");
        }
        if (request.amount().compareTo(MAX_AMOUNT) > 0) {
            throw new IllegalArgumentException("Expense amount exceeds the supported account limit.");
        }
        if (request.expenseDate() == null) {
            throw new IllegalArgumentException("Expense date is required.");
        }
        if (request.note() != null && request.note().length() > 500) {
            throw new IllegalArgumentException("Expense note cannot exceed 500 characters.");
        }
    }

    private void applyRequest(Expense expense, ExpenseRequest request) {
        expense.setCategory(requiredText(request.category(), "Category", 50));
        expense.setDescription(requiredText(request.description(), "Description", 200));
        expense.setAmount(request.amount().setScale(2, RoundingMode.UNNECESSARY));
        expense.setExpenseDate(request.expenseDate());
        expense.setPaymentMethod(requiredText(request.paymentMethod(), "Payment method", 50));
        expense.setNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
    }

    private String requiredText(String value, String label, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " is required.");
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(label + " cannot exceed " + maxLength + " characters.");
        }
        return normalized;
    }

    private BigDecimal amount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal amount(Double value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
