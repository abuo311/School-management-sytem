package com.school.services;

import com.school.dto.PayrollRecordRequest;
import com.school.entities.PayrollEmployeeType;
import com.school.entities.PayrollRecord;
import com.school.entities.PayrollStatus;
import com.school.entities.Role;
import com.school.entities.User;
import com.school.repositories.NonTeachingStaffRepository;
import com.school.repositories.PayrollRecordRepository;
import com.school.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PayrollServiceTest {

    private PayrollRecordRepository payrollRepository;
    private UserRepository userRepository;
    private NonTeachingStaffRepository nonTeachingStaffRepository;
    private PayrollService service;

    @BeforeEach
    void setUp() {
        payrollRepository = mock(PayrollRecordRepository.class);
        userRepository = mock(UserRepository.class);
        nonTeachingStaffRepository = mock(NonTeachingStaffRepository.class);
        service = new PayrollService(payrollRepository, userRepository, nonTeachingStaffRepository);
    }

    @Test
    void calculatesNetPayAndCreatesPendingPayrollRecord() {
        User user = new User();
        user.setId(12L);
        user.setUsername("teacher12");
        user.setFullName("Amina Teacher");
        user.setRole(Role.TEACHER);
        when(payrollRepository.existsByEmployeeTypeAndEmployeeIdAndYearAndMonth(
                PayrollEmployeeType.USER, 12L, 2026, 11)).thenReturn(false);
        when(userRepository.findById(12L)).thenReturn(Optional.of(user));
        when(payrollRepository.save(any(PayrollRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.createRecord(new PayrollRecordRequest(
                PayrollEmployeeType.USER, 12L, 2026, 11,
                new BigDecimal("1000.00"), new BigDecimal("150.00"), new BigDecimal("50.00"), "November pay"));

        assertEquals(new BigDecimal("1100.00"), result.netPay());
        assertEquals(PayrollStatus.PENDING, result.status());
        assertEquals("Amina Teacher", result.staffName());
        verify(payrollRepository).save(any(PayrollRecord.class));
    }

    @Test
    void rejectsDuplicateMonthlyPayrollForAnEmployee() {
        when(payrollRepository.existsByEmployeeTypeAndEmployeeIdAndYearAndMonth(
                PayrollEmployeeType.USER, 12L, 2026, 11)).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> service.createRecord(new PayrollRecordRequest(
                PayrollEmployeeType.USER, 12L, 2026, 11,
                new BigDecimal("1000.00"), BigDecimal.ZERO, BigDecimal.ZERO, null)));

        verifyNoInteractions(userRepository, nonTeachingStaffRepository);
    }

    @Test
    void rejectsDeductionsGreaterThanGrossPay() {
        User user = new User();
        user.setId(12L);
        user.setUsername("teacher12");
        when(payrollRepository.existsByEmployeeTypeAndEmployeeIdAndYearAndMonth(
                PayrollEmployeeType.USER, 12L, 2026, 11)).thenReturn(false);
        when(userRepository.findById(12L)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class, () -> service.createRecord(new PayrollRecordRequest(
                PayrollEmployeeType.USER, 12L, 2026, 11,
                new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("101.00"), null)));
    }
}
