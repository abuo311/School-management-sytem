package com.school.repositories;

import com.school.entities.NonTeachingStaff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NonTeachingStaffRepository extends JpaRepository<NonTeachingStaff, Long> {
    List<NonTeachingStaff> findAllByOrderByFullNameAsc();

    List<NonTeachingStaff> findByActiveTrueOrderByFullNameAsc();
}
