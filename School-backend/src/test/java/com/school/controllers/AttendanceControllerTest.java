package com.school.controllers;

import com.school.entities.Attendance;
import com.school.entities.Student;
import com.school.repositories.AttendanceRepository;
import com.school.services.AttendanceNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttendanceControllerTest {

    private AttendanceRepository attendanceRepository;
    private AttendanceNotificationService notificationService;
    private AttendanceController controller;

    @BeforeEach
    void setUp() {
        attendanceRepository = mock(AttendanceRepository.class);
        notificationService = mock(AttendanceNotificationService.class);
        controller = new AttendanceController(attendanceRepository, notificationService);
    }

    @Test
    void verifiedAttendanceUpdatesExistingRecordAndNotifiesOnStatusChange() {
        LocalDate date = LocalDate.of(2026, 11, 20);
        Student student = student(5L);
        Attendance existing = attendance(student, date, "ABSENT");
        existing.setId(12L);
        Attendance request = attendance(student(5L), date, "ABSENT");
        when(attendanceRepository.findFirstByStudentIdAndAttendanceDate(5L, date))
                .thenReturn(Optional.of(existing));
        when(attendanceRepository.save(existing)).thenReturn(existing);

        ResponseEntity<?> response = controller.saveVerifiedAttendance(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(existing, response.getBody());
        assertEquals("PRESENT", existing.getStatus());
        assertEquals("", existing.getReason());
        verify(notificationService).notifyParents(List.of(existing));
    }

    @Test
    void verifiedAttendanceDoesNotSendDuplicatePresentNotification() {
        LocalDate date = LocalDate.of(2026, 11, 20);
        Student student = student(5L);
        Attendance existing = attendance(student, date, "PRESENT");
        when(attendanceRepository.findFirstByStudentIdAndAttendanceDate(5L, date))
                .thenReturn(Optional.of(existing));
        when(attendanceRepository.save(existing)).thenReturn(existing);

        controller.saveVerifiedAttendance(attendance(student(5L), date, "ABSENT"));

        verify(notificationService, never()).notifyParents(anyList());
    }

    @Test
    void bulkSaveReusesExistingRecordForTheSameStudentAndDate() {
        LocalDate date = LocalDate.of(2026, 11, 20);
        Student student = student(5L);
        Attendance existing = attendance(student, date, "ABSENT");
        existing.setId(12L);
        Attendance incoming = attendance(student(5L), date, "PRESENT");
        when(attendanceRepository.findFirstByStudentIdAndAttendanceDate(5L, date))
                .thenReturn(Optional.of(existing));
        when(attendanceRepository.saveAll(List.of(incoming))).thenReturn(List.of(incoming));

        controller.saveBulk(List.of(incoming));

        assertEquals(12L, incoming.getId());
    }

    private Student student(Long id) {
        Student student = new Student();
        student.setId(id);
        return student;
    }

    private Attendance attendance(Student student, LocalDate date, String status) {
        Attendance attendance = new Attendance();
        attendance.setStudent(student);
        attendance.setAttendanceDate(date);
        attendance.setStatus(status);
        return attendance;
    }
}
