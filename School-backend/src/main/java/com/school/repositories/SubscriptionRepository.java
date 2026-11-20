package com.school.repositories;

import com.school.entities.Subscription;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT subscription FROM Subscription subscription WHERE subscription.id = :id")
    Optional<Subscription> findByIdForUpdate(@Param("id") Long id);
}
