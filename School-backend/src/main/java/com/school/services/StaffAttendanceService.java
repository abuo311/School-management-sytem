package com.school.services;

import com.school.dto.StaffAttendanceDto;
import com.school.dto.StaffAttendanceRequest;
import com.school.entities.Role;
import com.school.entities.StaffAttendance;
import com.school.entities.User;
import com.school.repositories.StaffAttendanceRepository;
import com.school.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class StaffAttendanceService {

    private static final Set<String> ALLOWED_STATUSES = Set.of("PRESENT", "ABSENT", "LATE", "LEAVE");

    private final StaffAttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    public StaffAttendanceService(StaffAttendanceRepository attendanceRepository, UserRepository userRepository) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<StaffAttendanceDto> getAttendanceForDate(LocalDate date) {
        Map<Long, StaffAttendance> records = attendanceRepository.findByAttendanceDate(date).stream()
                .collect(Collectors.toMap(record -> record.getUser().getId(), Function.identity(),
                        (first, second) -> second));

        return userRepository.findByEnabledTrueOrderByFullNameAsc().stream()
                .filter(user -> user.getRole() != null)
                .map(user -> toDto(user, date, records.get(user.getId())))
                .toList();
    }

    @Transactional
    public List<StaffAttendanceDto> saveForDate(LocalDate date, List<StaffAttendanceRequest> requests) {
        if (date == null) {
            throw new IllegalArgumentException("Attendance date is required.");
        }
        for (StaffAttendanceRequest request : requests) {
            if (request == null || request.userId() == null) {
                throw new IllegalArgumentException("Every attendance row must identify a staff account.");
            }
            String status = request.status() == null ? "" : request.status().trim().toUpperCase();
            if (!ALLOWED_STATUSES.contains(status)) {
                throw new IllegalArgumentException("Attendance status must be Present, Absent, Late or Leave.");
            }
            User user = userRepository.findById(request.userId())
                    .filter(User::isEnabled)
                    .orElseThrow(
                            () -> new IllegalArgumentException("Active staff account not found: " + request.userId()));
            StaffAttendance record = attendanceRepository.findByUserIdAndAttendanceDate(user.getId(), date)
                    .orElseGet(StaffAttendance::new);
            record.setUser(user);
            record.setAttendanceDate(date);
            record.setStatus(status);
            record.setReason(request.reason() == null ? null : request.reason().trim());
            attendanceRepository.save(record);
        }
        return getAttendanceForDate(date);
    }

    private StaffAttendanceDto toDto(User user, LocalDate date, StaffAttendance record) {
        Role role = user.getRole();
        String group = role == Role.TEACHER ? "TEACHING" : "NON_TEACHING";
        String name = user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName();
        return new StaffAttendanceDto(user.getId(), name, user.getUsername(), role.name(), group, date,
                record == null ? "UNMARKED" : record.getStatus(), record == null ? "" : record.getReason());
    }
}