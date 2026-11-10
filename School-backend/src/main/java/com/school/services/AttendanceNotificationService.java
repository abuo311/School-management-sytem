package com.school.services;

import com.school.entities.Attendance;
import com.school.entities.SchoolSettings;
import com.school.entities.Student;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
public class AttendanceNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(AttendanceNotificationService.class);

    private final StudentRepository studentRepository;
    private final SettingsRepository settingsRepository;
    private final FeeService feeService;
    private final SmsService smsService;

    public AttendanceNotificationService(StudentRepository studentRepository,
            SettingsRepository settingsRepository, FeeService feeService, SmsService smsService) {
        this.studentRepository = studentRepository;
        this.settingsRepository = settingsRepository;
        this.feeService = feeService;
        this.smsService = smsService;
    }

    public void notifyParents(List<Attendance> records) {
        SchoolSettings settings;
        try {
            settings = settingsRepository.findFirstByOrderByIdAsc().orElse(null);
        } catch (RuntimeException exception) {
            logger.warn("Could not load school settings for attendance SMS.", exception);
            return;
        }
        if (settings == null || records == null) {
            return;
        }

        for (Attendance record : records) {
            if (record == null || !isInSchool(record.getStatus()) || record.getStudent() == null
                    || record.getStudent().getId() == null) {
                continue;
            }
            try {
                studentRepository.findById(record.getStudent().getId())
                        .filter(Student::isEnabled)
                        .filter(student -> student.getParentContact() != null
                                && !student.getParentContact().isBlank())
                        .ifPresent(student -> sendAttendanceSms(student, record, settings));
            } catch (RuntimeException exception) {
                logger.warn("Could not prepare attendance SMS for student {}.", record.getStudent().getId(), exception);
            }
        }
    }

    private void sendAttendanceSms(Student student, Attendance attendance, SchoolSettings settings) {
        String feeBalance = currentFeeBalance(student.getId(), settings);
        double canteenFee = settings.getCanteenFeeAmount() == null
                ? 0d
                : Math.max(0d, settings.getCanteenFeeAmount());
        String frequency = validFrequency(settings.getCanteenFeeFrequency());
        String schoolName = settings.getSchoolName() == null || settings.getSchoolName().isBlank()
                ? "School"
                : settings.getSchoolName().trim();
        LocalDate date = attendance.getAttendanceDate();
        String status = "LATE".equalsIgnoreCase(attendance.getStatus()) ? "arrived late" : "is in school";
        String message = String.format(Locale.ROOT,
                "Dear Parent, %s %s %s on %s. Fee balance: %s. Canteen fee: GHS %.2f %s.",
                student.getFirstName(), student.getLastName(), status,
                date == null ? "today" : date.toString(), feeBalance, canteenFee, frequency.toLowerCase(Locale.ROOT));
        if (!"School".equals(schoolName)) {
            message = message.replace("is in school", "is in school at " + schoolName)
                    .replace("arrived late", "arrived late at " + schoolName);
        }
        smsService.sendSms(student.getParentContact(), message);
    }

    private String currentFeeBalance(Long studentId, SchoolSettings settings) {
        if (settings.getCurrentTerm() == null || settings.getCurrentTerm().isBlank()
                || settings.getAcademicYear() == null || settings.getAcademicYear().isBlank()) {
            return "unavailable";
        }
        double balance = feeService.getCurrentBalance(studentId, settings.getCurrentTerm(), settings.getAcademicYear());
        return String.format(Locale.ROOT, "GHS %.2f", Math.max(0d, balance));
    }

    private boolean isInSchool(String status) {
        return "PRESENT".equalsIgnoreCase(status) || "LATE".equalsIgnoreCase(status);
    }

    private String validFrequency(String frequency) {
        if (frequency == null) {
            return "TERMLY";
        }
        return switch (frequency.toUpperCase(Locale.ROOT)) {
            case "DAILY", "WEEKLY", "MONTHLY", "TERMLY" -> frequency.toUpperCase(Locale.ROOT);
            default -> "TERMLY";
        };
    }
}