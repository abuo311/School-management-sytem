package com.school.services;

import com.school.dto.PayrollRecordRequest;
import com.school.entities.NonTeachingStaff;
import com.school.entities.PayrollEmployeeType;
import com.school.entities.PayrollRecord;
import com.school.entities.PayrollStatus;
import com.school.entities.Role;
import com.school.entities.Teacher;
import com.school.entities.User;
import com.school.repositories.NonTeachingStaffRepository;
import com.school.repositories.PayrollRecordRepository;
import com.school.repositories.TeacherRepository;
import com.school.repositories.UserRepository;
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
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PayrollServiceTest {

    private PayrollRecordRepository payrollRepository;
    private UserRepository userRepository;
    private NonTeachingStaffRepository nonTeachingStaffRepository;
    private TeacherRepository teacherRepository;
    private PayrollService service;

    @BeforeEach
    void setUp() {
        payrollRepository = mock(PayrollRecordRepository.class);
        userRepository = mock(UserRepository.class);
        nonTeachingStaffRepository = mock(NonTeachingStaffRepository.class);
        teacherRepository = mock(TeacherRepository.class);
        service = new PayrollService(payrollRepository, userRepository, nonTeachingStaffRepository, teacherRepository);
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
    void includesProfilePhotoInTheEmployeeRoster() {
        User user = new User();
        user.setId(12L);
        user.setUsername("teacher12");
        user.setFullName("Amina Teacher");
        user.setRole(Role.TEACHER);
        Teacher teacher = new Teacher();
        teacher.setUser(user);
        teacher.setProfilePhoto("data:image/jpeg;base64,teacher-photo");
        when(userRepository.findByEnabledTrueOrderByFullNameAsc()).thenReturn(List.of(user));
        when(teacherRepository.findByUser_IdIn(List.of(12L))).thenReturn(List.of(teacher));
        when(nonTeachingStaffRepository.findByActiveTrueOrderByFullNameAsc()).thenReturn(List.of());

        var employees = service.getEmployees();

        assertEquals("data:image/jpeg;base64,teacher-photo", employees.get(0).profilePhoto());
    }

    @Test
    void fallsBackToAccountPhotoAndIncludesNonTeachingStaffPhoto() {
        User user = new User();
        user.setId(12L);
        user.setUsername("teacher12");
        user.setFullName("Amina Teacher");
        user.setRole(Role.TEACHER);
        user.setProfilePhoto("data:image/jpeg;base64,account-photo");
        NonTeachingStaff staff = new NonTeachingStaff();
        staff.setId(30L);
        staff.setFullName("Ama Staff");
        staff.setPosition("Cook");
        staff.setProfilePhoto("data:image/jpeg;base64,staff-photo");
        when(userRepository.findByEnabledTrueOrderByFullNameAsc()).thenReturn(List.of(user));
        when(teacherRepository.findByUser_IdIn(List.of(12L))).thenReturn(List.of());
        when(nonTeachingStaffRepository.findByActiveTrueOrderByFullNameAsc()).thenReturn(List.of(staff));

        var employees = service.getEmployees();

        assertEquals("data:image/jpeg;base64,account-photo", employees.get(0).profilePhoto());
        assertEquals("data:image/jpeg;base64,staff-photo", employees.get(1).profilePhoto());
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
