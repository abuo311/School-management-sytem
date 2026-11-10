package com.school.services;

import com.school.entities.Attendance;
import com.school.entities.SchoolSettings;
import com.school.entities.Student;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttendanceNotificationServiceTest {

    private StudentRepository studentRepository;
    private SettingsRepository settingsRepository;
    private FeeService feeService;
    private SmsService smsService;
    private AttendanceNotificationService notificationService;

    @BeforeEach
    void setUp() {
        studentRepository = mock(StudentRepository.class);
        settingsRepository = mock(SettingsRepository.class);
        feeService = mock(FeeService.class);
        smsService = mock(SmsService.class);
        notificationService = new AttendanceNotificationService(
                studentRepository, settingsRepository, feeService, smsService);
    }

    @Test
    void sendsAttendanceAndFeeDetailsOnlyForLearnersPresentAtSchool() {
        SchoolSettings settings = new SchoolSettings();
        settings.setSchoolName("Asonkwaa School");
        settings.setCurrentTerm("Term 1");
        settings.setAcademicYear("2026/2027");
        settings.setCanteenFeeAmount(25d);
        settings.setCanteenFeeFrequency("WEEKLY");
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));

        Student presentStudent = new Student();
        presentStudent.setId(5L);
        presentStudent.setFirstName("Ama");
        presentStudent.setLastName("Mensah");
        presentStudent.setParentContact("0241234567");
        when(studentRepository.findById(5L)).thenReturn(Optional.of(presentStudent));
        when(feeService.getCurrentBalance(5L, "Term 1", "2026/2027")).thenReturn(125d);

        Attendance present = attendance(5L, "PRESENT");
        Attendance absent = attendance(6L, "ABSENT");
        notificationService.notifyParents(List.of(present, absent));

        verify(smsService).sendSms(eq("0241234567"), eq(
                "Dear Parent, Ama Mensah is in school at Asonkwaa School on 2026-11-10. "
                        + "Fee balance: GHS 125.00. Canteen fee: GHS 25.00 weekly."));
        verify(studentRepository, never()).findById(6L);
    }

    @Test
    void sendsLateAttendanceNotification() {
        SchoolSettings settings = new SchoolSettings();
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));
        Student student = new Student();
        student.setId(5L);
        student.setFirstName("Ama");
        student.setLastName("Mensah");
        student.setParentContact("0241234567");
        when(studentRepository.findById(5L)).thenReturn(Optional.of(student));

        notificationService.notifyParents(List.of(attendance(5L, "LATE")));

        verify(smsService).sendSms(eq("0241234567"), eq(
                "Dear Parent, Ama Mensah arrived late on 2026-11-10. Fee balance: unavailable. "
                        + "Canteen fee: GHS 0.00 termly."));
    }

    private Attendance attendance(Long studentId, String status) {
        Student student = new Student();
        student.setId(studentId);
        Attendance attendance = new Attendance();
        attendance.setStudent(student);
        attendance.setStatus(status);
        attendance.setAttendanceDate(LocalDate.of(2026, 11, 10));
        return attendance;
    }
}