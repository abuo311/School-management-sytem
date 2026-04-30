package com.school.services;

import com.school.entities.PromotionLog;
import com.school.entities.Student;
import com.school.repositories.PromotionLogRepository;
import com.school.repositories.StudentRepository;
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

    public PromotionService(StudentRepository studentRepository, PromotionLogRepository logRepository) {
        this.studentRepository = studentRepository;
        this.logRepository = logRepository;
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
        int promotedCount = 0;

        for (Student student : students) {
            String currentLevel = student.getGradeLevel();
            if (PROMOTION_MAP.containsKey(currentLevel)) {
                String nextLevel = PROMOTION_MAP.get(currentLevel);
                student.setGradeLevel(nextLevel);
                student.setClassName(nextLevel);
                if ("GRADUATED".equals(nextLevel)) student.setEnabled(false);

                studentRepository.save(student);
                promotedCount++;
            }
        }

        // CREATE THE LOG ENTRY
        PromotionLog log = new PromotionLog();
        log.setPromotionDate(LocalDateTime.now());
        log.setStudentCount(promotedCount);
        log.setAcademicYear("2025/2026"); // You can make this dynamic later
        log.setPerformedBy("System Admin");
        logRepository.save(log);

        return "Success: " + promotedCount + " students promoted.";
    }

    public List<PromotionLog> getHistory() {
        return logRepository.findAllByOrderByPromotionDateDesc();
    }
}