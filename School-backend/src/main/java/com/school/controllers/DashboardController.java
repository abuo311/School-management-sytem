package com.school.controllers;

import com.school.repositories.FeeRepository;
import com.school.repositories.StudentRepository;
import com.school.repositories.TeacherRepository;
import com.school.repositories.UserRepository;
import com.school.repositories.NonTeachingStaffRepository;
import com.school.services.FeeAssessmentService;
import com.school.entities.Role;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "https://school-management-sytem-seven.vercel.app/:5173")
public class DashboardController {

    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final FeeRepository feeRepository;
    private final FeeAssessmentService feeAssessmentService;
    private final UserRepository userRepository;
    private final NonTeachingStaffRepository nonTeachingStaffRepository;

    public DashboardController(StudentRepository studentRepository,
            TeacherRepository teacherRepository,
            FeeRepository feeRepository,
            FeeAssessmentService feeAssessmentService,
            UserRepository userRepository,
            NonTeachingStaffRepository nonTeachingStaffRepository) {
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.feeRepository = feeRepository;
        this.feeAssessmentService = feeAssessmentService;
        this.userRepository = userRepository;
        this.nonTeachingStaffRepository = nonTeachingStaffRepository;
    }

    @GetMapping("/stats")
    public Map<String, Object> getDashboardStats(Authentication authentication) {
        Map<String, Object> stats = new HashMap<>();

        // 1. Basic Counts
        stats.put("totalStudents", studentRepository.countByEnabledTrue());
        stats.put("totalTeachers", teacherRepository.count());

        long totalTeachingStaff = userRepository.countByRoleAndEnabledTrue(Role.TEACHER);
        long totalNonTeachingStaff = nonTeachingStaffRepository.countByActiveTrue();
        stats.put("totalTeachingStaff", totalTeachingStaff);
        stats.put("totalNonTeachingStaff", totalNonTeachingStaff);
        stats.put("totalStaff", totalTeachingStaff + totalNonTeachingStaff);
        stats.put("totalDirectors", userRepository.countByRoleAndEnabledTrue(Role.DIRECTOR));
        stats.put("totalManagers", userRepository.countByRoleAndEnabledTrue(Role.MANAGER));

        boolean canViewFinance = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_SUPER_ADMIN")
                        || authority.getAuthority().equals("ROLE_ADMIN")
                        || authority.getAuthority().equals("ROLE_DIRECTOR")
                        || authority.getAuthority().equals("ROLE_MANAGER")
                        || authority.getAuthority().equals("ROLE_BURSAR"));
        if (canViewFinance) {
            stats.put("totalCollected", feeRepository.sumCollectedFeesForActiveStudents());
            stats.put("totalDebt", feeAssessmentService.getActiveLearnerOutstandingTotal());
        }

        return stats;
    }
}