package com.school.controllers;

import com.school.repositories.FeeRepository;
import com.school.repositories.StudentRepository;
import com.school.repositories.TeacherRepository;
import com.school.services.FeeAssessmentService;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardControllerTest {

    @Test
    void dashboardUsesActiveLearnerFinanceTotals() {
        StudentRepository studentRepository = mock(StudentRepository.class);
        TeacherRepository teacherRepository = mock(TeacherRepository.class);
        FeeRepository feeRepository = mock(FeeRepository.class);
        FeeAssessmentService feeAssessmentService = mock(FeeAssessmentService.class);

        when(studentRepository.countByEnabledTrue()).thenReturn(0L);
        when(teacherRepository.count()).thenReturn(3L);
        when(feeRepository.sumCollectedFeesForActiveStudents()).thenReturn(0.0);
        when(feeAssessmentService.getActiveLearnerOutstandingTotal()).thenReturn(0.0);

        DashboardController controller = new DashboardController(
                studentRepository, teacherRepository, feeRepository, feeAssessmentService);

        var authentication = new UsernamePasswordAuthenticationToken("admin", "",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        Map<String, Object> stats = controller.getDashboardStats(authentication);

        assertEquals(0L, stats.get("totalStudents"));
        assertEquals(0.0, stats.get("totalCollected"));
        assertEquals(0.0, stats.get("totalDebt"));
        verify(feeRepository).sumCollectedFeesForActiveStudents();
        verify(feeRepository, never()).sumAllCollectedFees();
        verify(feeRepository, never()).findAllLatestPayments();
        verify(feeAssessmentService).getActiveLearnerOutstandingTotal();
    }

    @Test
    void teacherDashboardDoesNotReturnOrQueryFinancialData() {
        StudentRepository studentRepository = mock(StudentRepository.class);
        TeacherRepository teacherRepository = mock(TeacherRepository.class);
        FeeRepository feeRepository = mock(FeeRepository.class);
        FeeAssessmentService feeAssessmentService = mock(FeeAssessmentService.class);
        DashboardController controller = new DashboardController(
                studentRepository, teacherRepository, feeRepository, feeAssessmentService);
        var authentication = new UsernamePasswordAuthenticationToken("teacher", "",
                List.of(new SimpleGrantedAuthority("ROLE_TEACHER")));

        Map<String, Object> stats = controller.getDashboardStats(authentication);

        org.junit.jupiter.api.Assertions.assertFalse(stats.containsKey("totalCollected"));
        org.junit.jupiter.api.Assertions.assertFalse(stats.containsKey("totalDebt"));
        verify(feeRepository, never()).sumCollectedFeesForActiveStudents();
        verify(feeAssessmentService, never()).getActiveLearnerOutstandingTotal();
    }
}
