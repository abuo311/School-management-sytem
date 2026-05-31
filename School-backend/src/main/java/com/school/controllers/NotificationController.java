package com.school.controllers;

import com.school.entities.ExamResult;
import com.school.entities.SchoolSettings;
import com.school.repositories.ExamResultRepository;
import com.school.repositories.SettingsRepository;
import com.school.services.EmailService;
import com.school.services.SmsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "https://school-management-sytem-seven.vercel.app/:5173")
public class NotificationController {

    private final SmsService smsService;
    private final EmailService emailService;
    private final ExamResultRepository resultRepository;
    private final SettingsRepository settingsRepository;

    public NotificationController(SmsService smsService,
            EmailService emailService,
            ExamResultRepository resultRepository,
            SettingsRepository settingsRepository) {
        this.smsService = smsService;
        this.emailService = emailService;
        this.resultRepository = resultRepository;
        this.settingsRepository = settingsRepository;
    }

    /**
     * INDIVIDUAL EMAIL WITH ATTACHMENT
     * Triggered from React for a single student report
     */
    @PostMapping("/email/report/student/{studentId}/term/{term}/attachment")
    public ResponseEntity<String> sendStudentEmailWithAttachment(
            @PathVariable Long studentId,
            @PathVariable String term,
            @RequestParam("file") MultipartFile file) {

        try {
            List<ExamResult> results = resultRepository.findByStudent_IdAndTerm(studentId, term);
            if (results.isEmpty())
                return ResponseEntity.badRequest().body("No results found for student");

            var student = results.get(0).getStudent();
            if (student.getParentEmail() == null || student.getParentEmail().isEmpty()) {
                return ResponseEntity.badRequest().body("Parent email not found");
            }

            String subject = "Academic Report Card: " + student.getFirstName() + " " + student.getLastName() + " - "
                    + term;
            String body = "<h3>Dear Parent,</h3><p>Please find the attached academic report for <b>"
                    + student.getFirstName() + " " + student.getLastName() + "</b> for " + term + ".</p>"
                    + "<p>Best Regards,<br>School Administration</p>";

            emailService.sendEmailWithAttachment(
                    student.getParentEmail(),
                    subject,
                    body,
                    file.getBytes(),
                    "Report_" + student.getLastName() + "_" + term.replace(" ", "_") + ".pdf");

            return ResponseEntity.ok("Email sent successfully to " + student.getParentEmail());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    /**
     * BULK EMAIL TRIGGER (Simplified)
     * For high-volume, you would typically generate PDFs on the backend using
     * iText/OpenPDF
     */
    @PostMapping("/email/report/bulk/class/{className}/term/{term}")
    public ResponseEntity<String> sendBulkClassEmail(@PathVariable String className, @PathVariable String term) {
        // This endpoint can be used to trigger backend-generated reports
        // Or simply acknowledge that the frontend will loop through students
        return ResponseEntity.ok("Bulk request received for class: " + className);
    }

    /**
     * SMS NOTIFICATION
     */
    @PostMapping("/sms/report/student/{studentId}/term/{term}")
    public ResponseEntity<String> sendStudentSms(@PathVariable Long studentId, @PathVariable String term) {
        List<ExamResult> results = resultRepository.findByStudent_IdAndTerm(studentId, term);
        if (results.isEmpty())
            return ResponseEntity.badRequest().body("No results found");

        var student = results.get(0).getStudent();
        double totalScore = results.stream().mapToDouble(ExamResult::getTotalScore).sum();
        List<Object[]> ranks = resultRepository.findClassRanks(student.getClassName(), term);

        int position = 0;
        for (int i = 0; i < ranks.size(); i++) {
            if (ranks.get(i)[0].equals(studentId)) {
                position = i + 1;
                break;
            }
        }

        String message = getSmsTemplate()
                .replace("{name}", student.getFirstName() + " " + student.getLastName())
                .replace("{term}", term)
                .replace("{score}", String.format("%.2f", totalScore))
                .replace("{position}", String.valueOf(position))
                .replace("{total}", String.valueOf(ranks.size()));

        if (student.getParentContact() != null) {
            smsService.sendSms(student.getParentContact(), message);
            return ResponseEntity.ok("SMS sent to " + student.getParentContact());
        }
        return ResponseEntity.badRequest().body("No parent contact found");
    }

    private String getSmsTemplate() {
        SchoolSettings settings = settingsRepository.findAll().stream().findFirst().orElse(new SchoolSettings());
        String template = settings.getReportSmsTemplate();
        if (template == null || template.isEmpty()) {
            return "Dear Parent, {name}'s report for {term} is ready. Score: {score}, Pos: {position}/{total}.";
        }
        return template;
    }
}