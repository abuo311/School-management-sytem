package com.school.repositories;

import com.school.entities.SchoolSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SettingsRepository extends JpaRepository<SchoolSettings, Long> {
    // No extra methods needed!
    // JpaRepository provides .findById() and .save() which we use in the Controller.
}