package com.school.repositories;

import com.school.entities.CanteenPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface CanteenPaymentRepository extends JpaRepository<CanteenPayment, Long> {

    List<CanteenPayment> findByBillingPeriod(String billingPeriod);

    List<CanteenPayment> findByStudentIdOrderByDatePaidDescIdDesc(Long studentId);

    @Query("SELECT SUM(payment.amountPaid) FROM CanteenPayment payment")
    BigDecimal sumAllPayments();
}
