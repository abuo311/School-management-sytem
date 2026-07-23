package com.school.services;

import com.school.entities.ExamResult;
import com.school.entities.Student;
import com.school.repositories.ExamResultRepository;
import com.school.repositories.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ResultDeliveryService {

    @Autowired private StudentRepository studentRepository;
    @Autowired private ExamResultRepository resultRepository;
    @Autowired private EmailService emailService;
    @Autowired private SmsService smsService;

    public void sendBulkReports(String className, String term) {
        String currentYear = "2025/2026";
        List<Student> students = studentRepository.findByClassName(className);

        for (Student student : students) {
            // Updated to fetch results for the specific student and term
            List<ExamResult> results = resultRepository.findByStudent_IdAndTerm(
                    student.getId(), term
            );

            if (!results.isEmpty()) {
                // Typically we use the first record or a summary record for the message
                ExamResult res = results.get(0);

                // FIXED: Changed getGuardianEmail() -> getParentEmail()
                // FIXED: Changed getGuardianPhone() -> getParentContact()
                String parentEmail = student.getParentEmail();
                String parentPhone = student.getParentContact();

                String message = String.format(
                        "Dear Parent, the %s term report for %s %s is ready. " +
                                "Total Score: %.1f. Position: %d of %d. " +
                                "Visit the portal for details. - EXCELSIOR ACADEMY",
                        term, student.getFirstName(), student.getLastName(),
                        res.getTotalScore(), res.getPosition(), res.getClassSize()
                );

                // Send Email
                if (parentEmail != null && !parentEmail.isEmpty()) {
                    try {
                        emailService.sendSimpleEmail(parentEmail, "Academic Report", message);
                    } catch (Exception e) {
                        System.err.println("Email failed for student " + student.getId() + ": " + e.getMessage());
                    }
                }

                // Send SMS via Arkesel
                if (parentPhone != null && !parentPhone.isEmpty()) {
                    try {
                        smsService.sendSms(parentPhone, message);
                    } catch (Exception e) {
                        System.err.println("SMS failed for student " + student.getId() + ": " + e.getMessage());
                    }
                }
            }
        }
    }
}