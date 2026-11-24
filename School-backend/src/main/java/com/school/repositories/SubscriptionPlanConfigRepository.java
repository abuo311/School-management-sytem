package com.school.repositories;

import com.school.entities.SubscriptionPlanConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscriptionPlanConfigRepository extends JpaRepository<SubscriptionPlanConfig, String> {
}
