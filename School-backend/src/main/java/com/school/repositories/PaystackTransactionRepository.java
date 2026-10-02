package com.school.repositories;

import com.school.entities.PaystackTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface PaystackTransactionRepository extends JpaRepository<PaystackTransaction, Long> {
    Optional<PaystackTransaction> findByReference(String reference);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT transaction FROM PaystackTransaction transaction WHERE transaction.reference = :reference")
    Optional<PaystackTransaction> findByReferenceForUpdate(@Param("reference") String reference);
}