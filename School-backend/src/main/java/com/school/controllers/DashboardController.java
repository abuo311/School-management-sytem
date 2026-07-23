package com.school.controllers;

import com.school.entities.FeePayment;
import com.school.repositories.FeeRepository;
import com.school.repositories.StudentRepository;
import com.school.repositories.TeacherRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "https://school-management-sytem-seven.vercel.app/:5173")
public class DashboardController {

    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final FeeRepository feeRepository;

    public DashboardController(StudentRepository studentRepository,
            TeacherRepository teacherRepository,
            FeeRepository feeRepository) {
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.feeRepository = feeRepository;
    }

    @GetMapping("/stats")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        // 1. Basic Counts
        stats.put("totalStudents", studentRepository.count());
        stats.put("totalTeachers", teacherRepository.count());

        // 2. Total Collected (Sums every payment row in the DB)
        Double totalCollected = feeRepository.sumAllCollectedFees();
        stats.put("totalCollected", totalCollected);

        // 3. Total Debt (Calculated from the most recent balance of each student)
        List<FeePayment> allLatest = feeRepository.findAllLatestPayments();
        double totalDebt = allLatest.stream()
                .mapToDouble(FeePayment::getBalance)
                .sum();
        stats.put("totalDebt", totalDebt);

        return stats;
    }
}