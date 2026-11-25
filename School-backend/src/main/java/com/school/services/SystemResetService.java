package com.school.services;

import com.school.entities.SchoolSettings;
import com.school.entities.Role;
import com.school.entities.User;
import com.school.repositories.SettingsRepository;
import com.school.repositories.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

@Service
public class SystemResetService {

    private final SettingsRepository settingsRepository;
    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public SystemResetService(SettingsRepository settingsRepository, UserRepository userRepository) {
        this.settingsRepository = settingsRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void resetAllSystemData() {
        deleteInDependencyOrder();
        resetSettings();
    }

    private void deleteInDependencyOrder() {
        entityManager.createQuery("DELETE FROM SubscriptionPlanConfig").executeUpdate();
        entityManager.createQuery("DELETE FROM LmsExamAnswer").executeUpdate();
        entityManager.createQuery("DELETE FROM LmsProgress").executeUpdate();
        entityManager.createQuery("DELETE FROM LmsExamAttempt").executeUpdate();
        entityManager.createQuery("DELETE FROM LmsExamOption").executeUpdate();
        entityManager.createQuery("DELETE FROM LmsExamQuestion").executeUpdate();
        entityManager.createQuery("DELETE FROM LmsExam").executeUpdate();
        entityManager.createQuery("DELETE FROM LmsLessonImage").executeUpdate();
        entityManager.createQuery("DELETE FROM LmsLesson").executeUpdate();
        entityManager.createQuery("DELETE FROM LmsCourse").executeUpdate();

        entityManager.createQuery("DELETE FROM LessonNoteAttachment").executeUpdate();
        entityManager.createQuery("DELETE FROM LessonNote").executeUpdate();
        entityManager.createQuery("DELETE FROM CanteenPayment").executeUpdate();
        entityManager.createQuery("DELETE FROM PayrollRecord").executeUpdate();
        entityManager.createQuery("DELETE FROM PaystackTransaction").executeUpdate();
        entityManager.createQuery("DELETE FROM PromotionLog").executeUpdate();
        entityManager.createQuery("DELETE FROM TimetableEntry").executeUpdate();
        entityManager.createQuery("DELETE FROM StaffAttendance").executeUpdate();
        entityManager.createQuery("DELETE FROM NonTeachingStaffAttendance").executeUpdate();
        entityManager.createQuery("DELETE FROM Attendance").executeUpdate();
        entityManager.createQuery("DELETE FROM ExamResult").executeUpdate();
        entityManager.createQuery("DELETE FROM FeeAssessment").executeUpdate();
        entityManager.createQuery("DELETE FROM FeePayment").executeUpdate();
        entityManager.createQuery("DELETE FROM Expense").executeUpdate();
        entityManager.createQuery("DELETE FROM Grade").executeUpdate();
        entityManager.createQuery("DELETE FROM SubscriptionPayment").executeUpdate();

        entityManager.createQuery("UPDATE User u SET u.student = null WHERE u.student IS NOT NULL").executeUpdate();
        entityManager.createQuery("DELETE FROM NonTeachingStaff").executeUpdate();
        entityManager.createQuery("DELETE FROM Teacher").executeUpdate();
        entityManager.createQuery("DELETE FROM Subject").executeUpdate();
        entityManager.createQuery("DELETE FROM SchoolClass").executeUpdate();
        entityManager.createQuery("DELETE FROM Student").executeUpdate();

        java.util.List<User> nonAdminUsers = userRepository.findAll().stream()
                .filter(user -> user.getRole() != Role.ADMIN && user.getRole() != Role.SUPER_ADMIN)
                .toList();
        if (!nonAdminUsers.isEmpty()) {
            userRepository.deleteAll(nonAdminUsers);
            userRepository.flush();
        }
    }

    private void resetSettings() {
        settingsRepository.deleteAll();
        settingsRepository.flush();

        SchoolSettings defaults = new SchoolSettings();
        defaults.setId(1L);
        defaults.setSchoolName("EduManager School");
        defaults.setMotto("");
        defaults.setAddress("");
        defaults.setPhone("");
        defaults.setEmail("");
        defaults.setAcademicYear("2025/2026");
        defaults.setCurrentTerm("Term 1");
        defaults.setHeadMasterName("");
        defaults.setHeadMasterRemark("");
        defaults.setTeacherRemark("");
        defaults.setNextTermBegins("");
        defaults.setNextTermFees(0d);
        defaults.setCanteenFeeAmount(0d);
        defaults.setCanteenFeeFrequency("TERMLY");
        defaults.setReportSmsTemplate("Dear Parent, {name}'s report for {term} is ready. Score: {score}, Pos: {position}/{total}.");
        defaults.setLogoUrl("");
        defaults.setHeadTeacherSign("");
        defaults.setSchoolStamp("");
        defaults.setFormMasters(new ArrayList<>());
        defaults.setStaffRemarks(new ArrayList<>());

        settingsRepository.saveAndFlush(defaults);
    }

    public SchoolSettings getDefaultSettings() {
        return settingsRepository.findFirstByOrderByIdAsc().orElseGet(SchoolSettings::new);
    }
}
