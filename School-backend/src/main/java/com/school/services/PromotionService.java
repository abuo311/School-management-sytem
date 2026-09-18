package com.school.services;

import com.school.entities.PromotionLog;
import com.school.entities.Student;
import com.school.repositories.PromotionLogRepository;
import com.school.repositories.StudentRepository;
import com.school.repositories.ExamResultRepository;
import com.school.repositories.FeeRepository;
import com.school.repositories.AttendanceRepository;
import com.school.repositories.SettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@Service
public class PromotionService {

    private final StudentRepository studentRepository;
    private final PromotionLogRepository logRepository;
    private final ExamResultRepository examResultRepository;
    private final FeeRepository feeRepository;
    private final AttendanceRepository attendanceRepository;
    private final SettingsRepository settingsRepository;

    public PromotionService(StudentRepository studentRepository, PromotionLogRepository logRepository,
            ExamResultRepository examResultRepository, FeeRepository feeRepository,
            AttendanceRepository attendanceRepository, SettingsRepository settingsRepository) {
        this.studentRepository = studentRepository;
        this.logRepository = logRepository;
        this.examResultRepository = examResultRepository;
        this.feeRepository = feeRepository;
        this.attendanceRepository = attendanceRepository;
        this.settingsRepository = settingsRepository;
    }

    private static final Map<String, String> PROMOTION_MAP = new HashMap<>();
    static {
        PROMOTION_MAP.put("KG 1", "KG 2");
        PROMOTION_MAP.put("KG 2", "Primary 1");
        PROMOTION_MAP.put("Primary 1", "Primary 2");
        PROMOTION_MAP.put("Primary 2", "Primary 3");
        PROMOTION_MAP.put("Primary 3", "Primary 4");
        PROMOTION_MAP.put("Primary 4", "Primary 5");
        PROMOTION_MAP.put("Primary 5", "Primary 6");
        PROMOTION_MAP.put("Primary 6", "JHS 1");
        PROMOTION_MAP.put("JHS 1", "JHS 2");
        PROMOTION_MAP.put("JHS 2", "JHS 3");
        PROMOTION_MAP.put("JHS 3", "GRADUATED");
    }

    @Transactional
    public String promoteAllStudents() {
        List<Student> students = studentRepository.findAll();
        var settings = settingsRepository.findAll().stream().findFirst().orElse(null);
        String previousYear = settings != null && settings.getAcademicYear() != null
                ? settings.getAcademicYear() : "2025/2026";
        String nextYear = nextAcademicYear(previousYear);
        int promotedCount = 0;

        for (Student student : students) {
            List<com.school.entities.ExamResult> results = examResultRepository
                    .findByStudent_IdAndAcademicYear(student.getId(), previousYear);
            double average = results.isEmpty() ? 0
                    : results.stream().mapToDouble(com.school.entities.ExamResult::getTotalScore).average().orElse(0);
            boolean promoted = average >= 50;
            student.setPromotionStatus(promoted ? "PROMOTED" : "FAILED");
            String currentLevel = student.getGradeLevel();
            if (promoted && PROMOTION_MAP.containsKey(currentLevel)) {
                String nextLevel = PROMOTION_MAP.get(currentLevel);
                student.setGradeLevel(nextLevel);
                student.setClassName(nextLevel);
                if ("GRADUATED".equals(nextLevel)) student.setEnabled(false);

                studentRepository.save(student);
                promotedCount++;
            } else {
                studentRepository.save(student);
            }
        }

        examResultRepository.deleteByAcademicYear(previousYear);
        feeRepository.deleteByAcademicYear(previousYear);
        attendanceRepository.deleteAllAttendance();

        if (settings != null) {
            settings.setAcademicYear(nextYear);
            settings.setCurrentTerm("Term 1");
            settingsRepository.save(settings);
        }

        // CREATE THE LOG ENTRY
        PromotionLog log = new PromotionLog();
        log.setPromotionDate(LocalDateTime.now());
        log.setStudentCount(promotedCount);
        log.setAcademicYear(previousYear);
        log.setPerformedBy("System Admin");
        logRepository.save(log);

        return "Success: " + promotedCount + " students promoted.";
    }

    private String nextAcademicYear(String academicYear) {
        try {
            String[] years = academicYear.split("/");
            int start = Integer.parseInt(years[0].trim());
            int end = Integer.parseInt(years[1].trim());
            return (start + 1) + "/" + (end + 1);
        } catch (Exception ignored) {
            return academicYear;
        }
    }

    public List<PromotionLog> getHistory() {
        return logRepository.findAllByOrderByPromotionDateDesc();
    }
}