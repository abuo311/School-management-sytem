package com.school.repositories;

import com.school.entities.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ClassRepository extends JpaRepository<SchoolClass, Long> {

    /**
     * This ensures the classes appear in alphabetical order
     * (e.g., JHS 1 before JHS 2) in your dropdowns.
     */
    List<SchoolClass> findAllByOrderByClassNameAsc();

    /**
     * Useful for checking if a class name already exists
     * before saving to avoid duplicates.
     */
    boolean existsByClassName(String className);
}