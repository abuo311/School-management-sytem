package com.school.controllers;

import com.school.dto.StaffAttendanceDto;
import com.school.dto.StaffAttendanceRequest;
import com.school.services.StaffAttendanceService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff-attendance")
public class StaffAttendanceController {

    private final StaffAttendanceService attendanceService;

    public StaffAttendanceController(StaffAttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping("/date/{date}")
    public List<StaffAttendanceDto> getForDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return attendanceService.getAttendanceForDate(date);
    }

    @PutMapping("/date/{date}")
    public ResponseEntity<?> saveForDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody List<StaffAttendanceRequest> requests) {
        try {
            return ResponseEntity.ok(attendanceService.saveForDate(date, requests));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }
}