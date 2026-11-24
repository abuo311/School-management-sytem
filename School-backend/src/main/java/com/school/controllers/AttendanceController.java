package com.school.controllers;

import com.school.entities.Attendance;
import com.school.repositories.AttendanceRepository;
import com.school.services.AttendanceNotificationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@RestController
@RequestMapping("/api/attendance")
// REMOVED @CrossOrigin to avoid the credential conflict fixed earlier
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;
    private final AttendanceNotificationService attendanceNotificationService;

    public AttendanceController(AttendanceRepository attendanceRepository,
            AttendanceNotificationService attendanceNotificationService) {
        this.attendanceRepository = attendanceRepository;
        this.attendanceNotificationService = attendanceNotificationService;
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
    public ResponseEntity<?> saveBulk(@RequestBody List<Attendance> list) {
        if (list.stream().anyMatch(record -> record != null && isWeekend(record.getAttendanceDate()))) {
            return ResponseEntity.badRequest().body("Attendance cannot be recorded on weekends.");
        }

        list.forEach(this::useExistingRecordId);
        List<Attendance> saved = attendanceRepository.saveAll(list);
        attendanceNotificationService.notifyParents(saved);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/verified")
    public ResponseEntity<?> saveVerifiedAttendance(@RequestBody Attendance request) {
        if (request == null || request.getStudent() == null || request.getStudent().getId() == null
                || request.getAttendanceDate() == null) {
            return ResponseEntity.badRequest().body("Student and attendance date are required.");
        }

        Long studentId = request.getStudent().getId();
        LocalDate attendanceDate = request.getAttendanceDate();
        if (isWeekend(attendanceDate)) {
            return ResponseEntity.badRequest().body("Attendance cannot be recorded on weekends.");
        }

        Attendance record = attendanceRepository.findFirstByStudentIdAndAttendanceDate(studentId, attendanceDate)
                .orElseGet(Attendance::new);
        boolean notifyParent = !"PRESENT".equalsIgnoreCase(record.getStatus());
        record.setStudent(request.getStudent());
        record.setAttendanceDate(attendanceDate);
        record.setStatus("PRESENT");
        record.setReason("");

        Attendance saved = attendanceRepository.save(record);
        if (notifyParent) {
            attendanceNotificationService.notifyParents(List.of(saved));
        }
        return ResponseEntity.ok(saved);
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

    private void useExistingRecordId(Attendance incoming) {
        if (incoming.getId() != null || incoming.getStudent() == null || incoming.getStudent().getId() == null
                || incoming.getAttendanceDate() == null) {
            return;
        }
        Optional<Attendance> existing = attendanceRepository.findFirstByStudentIdAndAttendanceDate(
                incoming.getStudent().getId(), incoming.getAttendanceDate());
        existing.ifPresent(record -> incoming.setId(record.getId()));
    }

    private boolean isWeekend(LocalDate date) {
        return date != null && date.getDayOfWeek().getValue() >= 6;
    }
}