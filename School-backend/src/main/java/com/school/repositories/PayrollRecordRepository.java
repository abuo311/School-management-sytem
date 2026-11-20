package com.school.repositories;

import com.school.entities.PayrollRecord;
import com.school.entities.PayrollEmployeeType;
import com.school.entities.PayrollStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface PayrollRecordRepository extends JpaRepository<PayrollRecord, Long> {

    List<PayrollRecord> findByYearAndMonthOrderByStaffNameAsc(Integer year, Integer month);

    boolean existsByEmployeeTypeAndEmployeeIdAndYearAndMonth(
            PayrollEmployeeType employeeType, Long employeeId, Integer year, Integer month);

    boolean existsByEmployeeTypeAndEmployeeIdAndYearAndMonthAndIdNot(
            PayrollEmployeeType employeeType, Long employeeId, Integer year, Integer month, Long id);

    @Query("SELECT SUM(record.netPay) FROM PayrollRecord record WHERE record.status = :status")
    BigDecimal sumNetPayByStatus(@Param("status") PayrollStatus status);
}
