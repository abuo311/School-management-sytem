package com.school.repositories;

import com.school.entities.Attendance;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    // Using a custom query ensures the database compares ONLY the date part
    @Query("SELECT a FROM Attendance a WHERE a.attendanceDate = :date")
    List<Attendance> findByAttendanceDate(@Param("date") LocalDate date);
    @Transactional
    @Modifying
    @Query("DELETE FROM Attendance")
    void deleteAllAttendance();
}