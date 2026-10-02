package com.school.services;

import com.school.dto.StaffAttendanceRequest;
import com.school.entities.Role;
import com.school.entities.StaffAttendance;
import com.school.entities.User;
import com.school.repositories.StaffAttendanceRepository;
import com.school.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StaffAttendanceServiceTest {

    private StaffAttendanceRepository attendanceRepository;
    private UserRepository userRepository;
    private StaffAttendanceService service;

    @BeforeEach
    void setUp() {
        attendanceRepository = mock(StaffAttendanceRepository.class);
        userRepository = mock(UserRepository.class);
        service = new StaffAttendanceService(attendanceRepository, userRepository);
    }

    @Test
    void listsActiveStaffGroupedByRoleAndDefaultsToUnmarked() {
        User teacher = staff(1L, "Teaching staff", Role.TEACHER);
        User bursar = staff(2L, "Office staff", Role.BURSAR);
        when(userRepository.findByEnabledTrueOrderByFullNameAsc()).thenReturn(List.of(teacher, bursar));
        when(attendanceRepository.findByAttendanceDate(LocalDate.parse("2026-10-02"))).thenReturn(List.of());

        var roster = service.getAttendanceForDate(LocalDate.parse("2026-10-02"));

        assertEquals("TEACHING", roster.get(0).staffGroup());
        assertEquals("NON_TEACHING", roster.get(1).staffGroup());
        assertEquals("UNMARKED", roster.get(0).status());
    }

    @Test
    void savesDailyStaffAttendanceForTheSelectedDate() {
        User teacher = staff(1L, "Teaching staff", Role.TEACHER);
        LocalDate date = LocalDate.parse("2026-10-02");
        AtomicReference<StaffAttendance> savedRecord = new AtomicReference<>();
        when(userRepository.findById(1L)).thenReturn(Optional.of(teacher));
        when(attendanceRepository.findByUserIdAndAttendanceDate(1L, date)).thenReturn(Optional.empty());
        when(attendanceRepository.findByAttendanceDate(date)).thenAnswer(invocation -> savedRecord.get() == null
                ? List.of()
                : List.of(savedRecord.get()));
        when(userRepository.findByEnabledTrueOrderByFullNameAsc()).thenReturn(List.of(teacher));
        when(attendanceRepository.save(any(StaffAttendance.class))).thenAnswer(invocation -> {
            StaffAttendance saved = invocation.getArgument(0);
            savedRecord.set(saved);
            return saved;
        });

        var result = service.saveForDate(date, List.of(new StaffAttendanceRequest(1L, "present", "")));

        assertEquals("PRESENT", result.get(0).status());
        assertEquals(date, result.get(0).attendanceDate());
        verify(attendanceRepository).save(any(StaffAttendance.class));
    }

    private User staff(Long id, String name, Role role) {
        User user = new User();
        user.setId(id);
        user.setFullName(name);
        user.setUsername("staff" + id);
        user.setRole(role);
        user.setEnabled(true);
        return user;
    }
}
