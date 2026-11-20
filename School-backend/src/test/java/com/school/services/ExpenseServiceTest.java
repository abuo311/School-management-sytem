package com.school.services;

import com.school.dto.AccountSummaryDto;
import com.school.dto.ExpenseRequest;
import com.school.repositories.CanteenPaymentRepository;
import com.school.repositories.ExpenseRepository;
import com.school.repositories.FeeRepository;
import com.school.repositories.PayrollRecordRepository;
import com.school.entities.PayrollStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExpenseServiceTest {

    private ExpenseRepository expenseRepository;
    private FeeRepository feeRepository;
    private CanteenPaymentRepository canteenPaymentRepository;
    private PayrollRecordRepository payrollRecordRepository;
    private ExpenseService expenseService;

    @BeforeEach
    void setUp() {
        expenseRepository = mock(ExpenseRepository.class);
        feeRepository = mock(FeeRepository.class);
        canteenPaymentRepository = mock(CanteenPaymentRepository.class);
        payrollRecordRepository = mock(PayrollRecordRepository.class);
        expenseService = new ExpenseService(
                expenseRepository, feeRepository, canteenPaymentRepository, payrollRecordRepository);
    }

    @Test
    void accountBalanceSubtractsRecordedExpensesAndPaidPayrollFromCollectedIncome() {
        when(feeRepository.sumAllCollectedFees()).thenReturn(1000d);
        when(canteenPaymentRepository.sumAllPayments()).thenReturn(new BigDecimal("200.00"));
        when(expenseRepository.sumAllExpenses()).thenReturn(new BigDecimal("150.00"));
        when(payrollRecordRepository.sumNetPayByStatus(PayrollStatus.PAID))
                .thenReturn(new BigDecimal("300.00"));

        AccountSummaryDto summary = expenseService.getAccountSummary();

        assertEquals(0, new BigDecimal("1200.00").compareTo(summary.totalIncome()));
        assertEquals(0, new BigDecimal("450.00").compareTo(summary.totalSpent()));
        assertEquals(0, new BigDecimal("750.00").compareTo(summary.availableBalance()));
        verify(payrollRecordRepository).sumNetPayByStatus(PayrollStatus.PAID);
    }

    @Test
    void rejectsExpenseAmountsWithMoreThanTwoDecimalPlaces() {
        ExpenseRequest request = new ExpenseRequest(
                "Utilities", "Water bill", new BigDecimal("12.345"),
                LocalDate.of(2026, 11, 20), "Cash", null);

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class, () -> expenseService.create(request, "bursar"));

        assertEquals("Expense amount can have at most two decimal places.", error.getMessage());
    }
}
