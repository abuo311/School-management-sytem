package com.school.services;

import com.school.dto.StaffAttendanceDto;
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
    private final NonTeachingStaffAttendanceRepository nonTeachingAttendanceRepository;
    private final NonTeachingStaffRepository nonTeachingStaffRepository;
    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;

    public StaffAttendanceService(
            StaffAttendanceRepository attendanceRepository,
            NonTeachingStaffAttendanceRepository nonTeachingAttendanceRepository,
            NonTeachingStaffRepository nonTeachingStaffRepository,
            TeacherRepository teacherRepository,
            UserRepository userRepository) {
        this.attendanceRepository = attendanceRepository;
        this.nonTeachingAttendanceRepository = nonTeachingAttendanceRepository;
        this.nonTeachingStaffRepository = nonTeachingStaffRepository;
        this.teacherRepository = teacherRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<StaffAttendanceDto> getAttendanceForDate(LocalDate date) {
        Map<Long, StaffAttendance> records = attendanceRepository.findByAttendanceDate(date).stream()
                .collect(Collectors.toMap(record -> record.getUser().getId(), Function.identity(),
                        (first, second) -> second));
        Map<Long, NonTeachingStaffAttendance> nonTeachingRecords = nonTeachingAttendanceRepository
                .findByAttendanceDate(date).stream()
                .collect(Collectors.toMap(record -> record.getStaff().getId(), Function.identity(),
                        (first, second) -> second));

        List<User> activeUsers = userRepository.findByEnabledTrueOrderByFullNameAsc().stream()
                .filter(user -> user.getRole() != null)
                .toList();
        List<Long> activeUserIds = new java.util.ArrayList<>();
        for (User activeUser : activeUsers) {
            activeUserIds.add(activeUser.getId());
        }
        Map<Long, String> teacherPhotos = teacherRepository.findByUser_IdIn(
                        activeUserIds)
                .stream()
                .filter(teacher -> teacher.getUser() != null)
                .collect(Collectors.toMap(teacher -> teacher.getUser().getId(), teacher -> teacher.getProfilePhoto(),
                        (first, second) -> first));
        List<StaffAttendanceDto> attendance = activeUsers.stream()
                .map(user -> toDto(user, date, records.get(user.getId()), teacherPhotos.get(user.getId())))
                .toList();
        List<StaffAttendanceDto> nonTeachingAttendance = nonTeachingStaffRepository
                .findByActiveTrueOrderByFullNameAsc().stream()
                .map(staff -> toDto(staff, date, nonTeachingRecords.get(staff.getId())))
                .toList();
        return java.util.stream.Stream.concat(attendance.stream(), nonTeachingAttendance.stream()).toList();
    }

    @Transactional
    public List<StaffAttendanceDto> saveForDate(LocalDate date, List<StaffAttendanceRequest> requests) {
        if (date == null) {
            throw new IllegalArgumentException("Attendance date is required.");
        }
        for (StaffAttendanceRequest request : requests) {
            if (request == null) {
                throw new IllegalArgumentException("Every attendance row must identify exactly one staff member.");
            }
            Long userId = request.userId();
            Long nonTeachingStaffId = request.nonTeachingStaffId();
            if ((userId == null) == (nonTeachingStaffId == null)) {
                throw new IllegalArgumentException("Every attendance row must identify exactly one staff member.");
            }
            String status = request.status() == null ? "" : request.status().trim().toUpperCase();
            if (!ALLOWED_STATUSES.contains(status)) {
                throw new IllegalArgumentException("Attendance status must be Present, Absent, Late or Leave.");
            }
            if (userId != null) {
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new IllegalArgumentException("Active staff account not found: " + userId));
                if (!user.isEnabled()) {
                    throw new IllegalArgumentException("Active staff account not found: " + userId);
                }
                StaffAttendance record = attendanceRepository.findByUserIdAndAttendanceDate(user.getId(), date)
                        .orElseGet(StaffAttendance::new);
                record.setUser(user);
                record.setAttendanceDate(date);
                record.setStatus(status);
                record.setReason(request.reason() == null ? null : request.reason().trim());
                attendanceRepository.save(record);
            } else {
                if (nonTeachingStaffId == null) {
                    throw new IllegalArgumentException("Every attendance row must identify exactly one staff member.");
                }
                NonTeachingStaff staff = nonTeachingStaffRepository.findById(nonTeachingStaffId)
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Active non-teaching staff member not found: " + nonTeachingStaffId));
                if (!staff.isActive()) {
                    throw new IllegalArgumentException(
                            "Active non-teaching staff member not found: " + nonTeachingStaffId);
                }
                NonTeachingStaffAttendance record = nonTeachingAttendanceRepository
                        .findByStaffIdAndAttendanceDate(staff.getId(), date)
                        .orElseGet(NonTeachingStaffAttendance::new);
                record.setStaff(staff);
                record.setAttendanceDate(date);
                record.setStatus(status);
                record.setReason(request.reason() == null ? null : request.reason().trim());
                nonTeachingAttendanceRepository.save(record);
            }
        }
        return getAttendanceForDate(date);
    }

    private StaffAttendanceDto toDto(User user, LocalDate date, StaffAttendance record, String profilePhoto) {
        Role role = user.getRole();
        String group = role == Role.TEACHER ? "TEACHING" : "NON_TEACHING";
        String name = user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName();
        return new StaffAttendanceDto(user.getId(), null, name, user.getUsername(), role.name(), group, profilePhoto,
                date, record == null ? "UNMARKED" : record.getStatus(), record == null ? "" : record.getReason());
    }

    private StaffAttendanceDto toDto(NonTeachingStaff staff, LocalDate date, NonTeachingStaffAttendance record) {
        return new StaffAttendanceDto(null, staff.getId(), staff.getFullName(), "", staff.getPosition(),
                "NON_TEACHING", staff.getProfilePhoto(), date, record == null ? "UNMARKED" : record.getStatus(),
                record == null ? "" : record.getReason());
    }
}