package com.school.repositories;

import com.school.entities.PromotionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PromotionLogRepository extends JpaRepository<PromotionLog, Long> {
    List<PromotionLog> findAllByOrderByPromotionDateDesc();
}