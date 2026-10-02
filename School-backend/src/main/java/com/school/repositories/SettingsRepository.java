package com.school.repositories;

import com.school.entities.SchoolSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SettingsRepository extends JpaRepository<SchoolSettings, Long> {
    Optional<SchoolSettings> findFirstByOrderByIdAsc();
}