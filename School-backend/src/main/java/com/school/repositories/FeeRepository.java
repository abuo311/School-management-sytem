package com.school.repositories;

import com.school.entities.FeePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FeeRepository extends JpaRepository<FeePayment, Long> {

    List<FeePayment> findByStudentId(Long studentId);

    // Finds students who currently owe money based on their most recent transaction
    @Query("SELECT f FROM FeePayment f WHERE f.id IN (SELECT MAX(f2.id) FROM FeePayment f2 GROUP BY f2.student.id) AND f.balance > 0")
    List<FeePayment> findAllDebtors();

    // Gets the latest transaction for every student
    @Query("SELECT f FROM FeePayment f WHERE f.id IN (SELECT MAX(f2.id) FROM FeePayment f2 GROUP BY f2.student.id)")
    List<FeePayment> findAllLatestPayments();

    // Sums every single payment ever recorded
    @Query("SELECT COALESCE(SUM(f.amountPaid), 0) FROM FeePayment f")
    Double sumAllCollectedFees();
}