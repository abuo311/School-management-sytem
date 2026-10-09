package com.school.services;

import com.school.dto.StaffAttendanceRequest;
import com.school.entities.NonTeachingStaff;
import com.school.entities.NonTeachingStaffAttendance;
import com.school.entities.Role;
import com.school.entities.StaffAttendance;
import com.school.entities.User;
import com.school.repositories.NonTeachingStaffAttendanceRepository;
import com.school.repositories.NonTeachingStaffRepository;
import com.school.repositories.StaffAttendanceRepository;
import com.school.repositories.TeacherRepository;
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
    private NonTeachingStaffAttendanceRepository nonTeachingAttendanceRepository;
    private NonTeachingStaffRepository nonTeachingStaffRepository;
    private TeacherRepository teacherRepository;
    private UserRepository userRepository;
    private StaffAttendanceService service;

    @BeforeEach
    void setUp() {
        attendanceRepository = mock(StaffAttendanceRepository.class);
        nonTeachingAttendanceRepository = mock(NonTeachingStaffAttendanceRepository.class);
        nonTeachingStaffRepository = mock(NonTeachingStaffRepository.class);
        teacherRepository = mock(TeacherRepository.class);
        userRepository = mock(UserRepository.class);
        service = new StaffAttendanceService(
                attendanceRepository, nonTeachingAttendanceRepository, nonTeachingStaffRepository,
                teacherRepository, userRepository);
    }

    @Test
    void listsActiveStaffGroupedByRoleAndDefaultsToUnmarked() {
        User teacher = staff(1L, "Teaching staff", Role.TEACHER);
        User bursar = staff(2L, "Office staff", Role.BURSAR);
        when(userRepository.findByEnabledTrueOrderByFullNameAsc()).thenReturn(List.of(teacher, bursar));
        when(attendanceRepository.findByAttendanceDate(LocalDate.parse("2026-10-02"))).thenReturn(List.of());
        when(nonTeachingStaffRepository.findByActiveTrueOrderByFullNameAsc()).thenReturn(List.of());
        when(nonTeachingAttendanceRepository.findByAttendanceDate(LocalDate.parse("2026-10-02"))).thenReturn(List.of());

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
        when(nonTeachingStaffRepository.findByActiveTrueOrderByFullNameAsc()).thenReturn(List.of());
        when(nonTeachingAttendanceRepository.findByAttendanceDate(date)).thenReturn(List.of());
        when(attendanceRepository.save(any(StaffAttendance.class))).thenAnswer(invocation -> {
            StaffAttendance saved = invocation.getArgument(0);
            savedRecord.set(saved);
            return saved;
        });

        var result = service.saveForDate(date, List.of(new StaffAttendanceRequest(1L, null, "present", "")));

        assertEquals("PRESENT", result.get(0).status());
        assertEquals(date, result.get(0).attendanceDate());
        verify(attendanceRepository).save(any(StaffAttendance.class));
    }

    @Test
    void listsAndSavesAttendanceForNonTeachingStaffWithoutUserAccounts() {
        LocalDate date = LocalDate.parse("2026-10-02");
        NonTeachingStaff staff = new NonTeachingStaff();
        staff.setId(3L);
        staff.setFullName("School Caterer");
        staff.setPosition("Caterer");
        NonTeachingStaffAttendance savedAttendance = new NonTeachingStaffAttendance();
        when(nonTeachingStaffRepository.findById(3L)).thenReturn(Optional.of(staff));
        when(nonTeachingStaffRepository.findByActiveTrueOrderByFullNameAsc()).thenReturn(List.of(staff));
        when(nonTeachingAttendanceRepository.findByStaffIdAndAttendanceDate(3L, date))
                .thenReturn(Optional.empty());
        when(nonTeachingAttendanceRepository.findByAttendanceDate(date)).thenAnswer(invocation ->
                savedAttendance.getStaff() == null ? List.of() : List.of(savedAttendance));
        when(attendanceRepository.findByAttendanceDate(date)).thenReturn(List.of());
        when(userRepository.findByEnabledTrueOrderByFullNameAsc()).thenReturn(List.of());
        when(nonTeachingAttendanceRepository.save(any(NonTeachingStaffAttendance.class))).thenAnswer(invocation -> {
            NonTeachingStaffAttendance record = invocation.getArgument(0);
            savedAttendance.setStaff(record.getStaff());
            savedAttendance.setAttendanceDate(record.getAttendanceDate());
            savedAttendance.setStatus(record.getStatus());
            savedAttendance.setReason(record.getReason());
            return record;
        });

        var result = service.saveForDate(date, List.of(new StaffAttendanceRequest(null, 3L, "present", "")));

        assertEquals(1, result.size());
        assertEquals("Caterer", result.get(0).role());
        assertEquals("PRESENT", result.get(0).status());
        assertEquals(3L, result.get(0).nonTeachingStaffId());
        verify(nonTeachingAttendanceRepository).save(any(NonTeachingStaffAttendance.class));
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
