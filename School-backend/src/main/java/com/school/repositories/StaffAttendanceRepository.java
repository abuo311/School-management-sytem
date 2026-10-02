package com.school.repositories;

import com.school.entities.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance, Long> {
    List<StaffAttendance> findByAttendanceDate(LocalDate attendanceDate);

    Optional<StaffAttendance> findByUserIdAndAttendanceDate(Long userId, LocalDate attendanceDate);
}