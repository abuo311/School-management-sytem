package com.school.repositories;

import com.school.entities.NonTeachingStaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface NonTeachingStaffAttendanceRepository extends JpaRepository<NonTeachingStaffAttendance, Long> {
    List<NonTeachingStaffAttendance> findByAttendanceDate(LocalDate attendanceDate);

    Optional<NonTeachingStaffAttendance> findByStaffIdAndAttendanceDate(Long staffId, LocalDate attendanceDate);
}
