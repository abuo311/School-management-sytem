package com.school.repositories;

import com.school.entities.PayrollRecord;
import com.school.entities.PayrollEmployeeType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PayrollRecordRepository extends JpaRepository<PayrollRecord, Long> {

    List<PayrollRecord> findByYearAndMonthOrderByStaffNameAsc(Integer year, Integer month);

    boolean existsByEmployeeTypeAndEmployeeIdAndYearAndMonth(
            PayrollEmployeeType employeeType, Long employeeId, Integer year, Integer month);

    boolean existsByEmployeeTypeAndEmployeeIdAndYearAndMonthAndIdNot(
            PayrollEmployeeType employeeType, Long employeeId, Integer year, Integer month, Long id);
}
