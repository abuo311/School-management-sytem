package com.school.services;

import com.school.dto.PayrollEmployeeDto;
import com.school.dto.PayrollRecordDto;
import com.school.dto.PayrollRecordRequest;
import com.school.dto.PayrollPaymentRequest;
import com.school.entities.NonTeachingStaff;
import com.school.entities.PayrollEmployeeType;
import com.school.entities.PayrollRecord;
import com.school.entities.PayrollStatus;
import com.school.entities.User;
import com.school.repositories.NonTeachingStaffRepository;
import com.school.repositories.PayrollRecordRepository;
import com.school.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class PayrollService {

    private final PayrollRecordRepository payrollRepository;
    private final UserRepository userRepository;
    private final NonTeachingStaffRepository nonTeachingStaffRepository;

    public PayrollService(
            PayrollRecordRepository payrollRepository,
            UserRepository userRepository,
            NonTeachingStaffRepository nonTeachingStaffRepository) {
        this.payrollRepository = payrollRepository;
        this.userRepository = userRepository;
        this.nonTeachingStaffRepository = nonTeachingStaffRepository;
    }

    @Transactional(readOnly = true)
    public List<PayrollEmployeeDto> getEmployees() {
        List<PayrollEmployeeDto> employees = new ArrayList<>();
        for (User user : userRepository.findByEnabledTrueOrderByFullNameAsc()) {
            String name = user.getFullName() == null || user.getFullName().isBlank()
                    ? user.getUsername()
                    : user.getFullName();
            employees.add(new PayrollEmployeeDto(
                    PayrollEmployeeType.USER, user.getId(), name, user.getRoleName()));
        }
        for (NonTeachingStaff staff : nonTeachingStaffRepository.findByActiveTrueOrderByFullNameAsc()) {
            employees.add(new PayrollEmployeeDto(
                    PayrollEmployeeType.NON_TEACHING, staff.getId(), staff.getFullName(), staff.getPosition()));
        }
        return employees;
    }

    @Transactional(readOnly = true)
    public List<PayrollRecordDto> getRecords(int year, int month) {
        validatePeriod(year, month);
        return payrollRepository.findByYearAndMonthOrderByStaffNameAsc(year, month).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public PayrollRecordDto createRecord(PayrollRecordRequest request) {
        validatePeriod(request.year(), request.month());
        if (payrollRepository.existsByEmployeeTypeAndEmployeeIdAndYearAndMonth(
                request.employeeType(), request.employeeId(), request.year(), request.month())) {
            throw new IllegalArgumentException("A payroll record already exists for this employee and month.");
        }
        EmployeeDetails employee = findActiveEmployee(request.employeeType(), request.employeeId());

        PayrollRecord record = new PayrollRecord();
        record.setEmployeeType(request.employeeType());
        record.setEmployeeId(request.employeeId());
        record.setStaffName(employee.name());
        record.setPosition(employee.position());
        record.setYear(request.year());
        record.setMonth(request.month());
        applyAmounts(record, request);
        record.setStatus(PayrollStatus.PENDING);
        record.setNote(trimToNull(request.note()));
        return toDto(payrollRepository.save(record));
    }

    @Transactional
    public PayrollRecordDto updateRecord(Long id, PayrollRecordRequest request) {
        PayrollRecord record = payrollRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payroll record not found."));
        if (record.getStatus() == PayrollStatus.PAID) {
            throw new IllegalArgumentException("Paid payroll records cannot be edited.");
        }
        validatePeriod(request.year(), request.month());
        if (payrollRepository.existsByEmployeeTypeAndEmployeeIdAndYearAndMonthAndIdNot(
                request.employeeType(), request.employeeId(), request.year(), request.month(), id)) {
            throw new IllegalArgumentException("A payroll record already exists for this employee and month.");
        }

        EmployeeDetails employee = findActiveEmployee(request.employeeType(), request.employeeId());
        record.setEmployeeType(request.employeeType());
        record.setEmployeeId(request.employeeId());
        record.setStaffName(employee.name());
        record.setPosition(employee.position());
        record.setYear(request.year());
        record.setMonth(request.month());
        applyAmounts(record, request);
        record.setNote(trimToNull(request.note()));
        return toDto(payrollRepository.save(record));
    }

    @Transactional
    public PayrollRecordDto markPaid(Long id, PayrollPaymentRequest request) {
        PayrollRecord record = payrollRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payroll record not found."));
        if (record.getStatus() == PayrollStatus.PAID) {
            throw new IllegalArgumentException("This payroll record has already been paid.");
        }
        record.setStatus(PayrollStatus.PAID);
        record.setPaymentDate(LocalDate.now());
        record.setPaymentMethod(request.paymentMethod().trim());
        return toDto(payrollRepository.save(record));
    }

    private EmployeeDetails findActiveEmployee(PayrollEmployeeType type, Long id) {
        if (type == null || id == null) {
            throw new IllegalArgumentException("An active employee is required.");
        }
        if (type == PayrollEmployeeType.USER) {
            User user = userRepository.findById(id)
                    .filter(User::isEnabled)
                    .orElseThrow(() -> new IllegalArgumentException("Active staff member not found."));
            String name = user.getFullName() == null || user.getFullName().isBlank()
                    ? user.getUsername()
                    : user.getFullName();
            return new EmployeeDetails(name, user.getRoleName());
        }
        NonTeachingStaff staff = nonTeachingStaffRepository.findById(id)
                .filter(NonTeachingStaff::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Active non-teaching staff member not found."));
        return new EmployeeDetails(staff.getFullName(), staff.getPosition());
    }

    private void applyAmounts(PayrollRecord record, PayrollRecordRequest request) {
        BigDecimal basicSalary = request.basicSalary();
        BigDecimal allowances = request.allowances();
        BigDecimal deductions = request.deductions();
        if (deductions.compareTo(basicSalary.add(allowances)) > 0) {
            throw new IllegalArgumentException("Deductions cannot exceed basic salary plus allowances.");
        }
        record.setBasicSalary(basicSalary);
        record.setAllowances(allowances);
        record.setDeductions(deductions);
        record.setNetPay(basicSalary.add(allowances).subtract(deductions));
    }

    private void validatePeriod(int year, int month) {
        if (year < 2000 || year > 9999 || month < 1 || month > 12) {
            throw new IllegalArgumentException("A valid payroll year and month are required.");
        }
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private PayrollRecordDto toDto(PayrollRecord record) {
        return new PayrollRecordDto(
                record.getId(),
                record.getEmployeeType(),
                record.getEmployeeId(),
                record.getStaffName(),
                record.getPosition(),
                record.getYear(),
                record.getMonth(),
                record.getBasicSalary(),
                record.getAllowances(),
                record.getDeductions(),
                record.getNetPay(),
                record.getStatus(),
                record.getPaymentDate(),
                record.getPaymentMethod(),
                record.getNote());
    }

    private record EmployeeDetails(String name, String position) {
    }
}
