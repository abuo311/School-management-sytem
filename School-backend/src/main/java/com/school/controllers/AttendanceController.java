package com.school.controllers;

import com.school.entities.Attendance;
import com.school.repositories.AttendanceRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/attendance")
// REMOVED @CrossOrigin to avoid the credential conflict fixed earlier
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;

    // Use only Constructor injection (Best practice)
    public AttendanceController(AttendanceRepository attendanceRepository) {
        this.attendanceRepository = attendanceRepository;
    }

    // FIXES the 404: Provides a base GET for the dashboard
    @GetMapping
    public List<Attendance> getAll() {
        return attendanceRepository.findAll();
    }

    @GetMapping("/date/{date}")
    public List<Attendance> getAttendanceByDate(
            @PathVariable("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return attendanceRepository.findByAttendanceDate(date);
    }

    @PostMapping("/bulk")
    public List<Attendance> saveBulk(@RequestBody List<Attendance> list) {
        return attendanceRepository.saveAll(list);
    }

    @DeleteMapping("/clear-all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> clearAllAttendance() {
        try {
            attendanceRepository.deleteAllAttendance();
            return ResponseEntity.ok("All records cleared.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
    @GetMapping("/stats")
    public ResponseEntity<?> getAttendanceStats() {
        List<Attendance> all = attendanceRepository.findAll();
        long present = all.stream().filter(a -> "PRESENT".equalsIgnoreCase(a.getStatus())).count();
        long absent = all.stream().filter(a -> "ABSENT".equalsIgnoreCase(a.getStatus())).count();

        Map<String, Long> stats = new HashMap<>();
        stats.put("present", present);
        stats.put("absent", absent);
        return ResponseEntity.ok(stats);
    }
}