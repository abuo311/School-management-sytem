package com.school.controllers;

import com.school.entities.ExamResult;
import com.school.repositories.ExamResultRepository;
import com.school.services.EmailService;
import com.school.services.ResultService;
import com.school.services.SmsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/results")
@CrossOrigin(origins = "https://school-management-sytem-seven.vercel.app/:5173")
public class ExamResultController {

    private final ExamResultRepository resultRepository;
    private final SmsService smsService;
    private final EmailService emailService;
    private final ResultService resultService;

    public ExamResultController(
            ExamResultRepository resultRepository,
            SmsService smsService,
            EmailService emailService,
            ResultService resultService) {
        this.resultRepository = resultRepository;
        this.smsService = smsService;
        this.emailService = emailService;
        this.resultService = resultService;
    }

    @PostMapping("/deliver-class/{className}/term/{term}")
    public ResponseEntity<String> deliverClassReports(@PathVariable String className, @PathVariable String term) {
        List<ExamResult> results = resultRepository.findByStudent_ClassNameAndTerm(className, term);

        if (results.isEmpty())
            return ResponseEntity.badRequest().body("No results found to deliver.");

        Map<Long, List<ExamResult>> studentMap = results.stream()
                .collect(Collectors.groupingBy(r -> r.getStudent().getId()));

        studentMap.forEach((studentId, studentResults) -> {
            try {
                var student = studentResults.get(0).getStudent();
                double total = studentResults.stream().mapToDouble(ExamResult::getTotalScore).sum();
                double avg = studentResults.isEmpty() ? 0 : total / studentResults.size();

                // FIXED: Changed getGuardianName() to getParentName()
                String message = String.format(
                        "Hello %s, your child %s's %s term report is ready. Total: %.2f, Avg: %.2f%%.",
                        student.getParentName(), student.getFirstName(), term, total, avg);

                // FIXED: Changed getGuardianEmail() to getParentEmail()
                if (student.getParentEmail() != null && !student.getParentEmail().isEmpty()) {
                    try {
                        emailService.sendSimpleEmail(student.getParentEmail(), "Report Card", message);
                    } catch (Exception e) {
                        System.err.println("Email failed for student " + studentId + ": " + e.getMessage());
                    }
                }

                // FIXED: Changed getGuardianPhone() to getParentContact()
                if (student.getParentContact() != null && !student.getParentContact().isEmpty()) {
                    try {
                        smsService.sendSms(student.getParentContact(), message);
                    } catch (Exception e) {
                        System.err.println("SMS failed for student " + studentId + ": " + e.getMessage());
                    }
                }
            } catch (Exception e) {
                System.err.println("Critical error processing student " + studentId + ": " + e.getMessage());
            }
        });

        return ResponseEntity.ok("Delivery process completed for " + studentMap.size() + " students.");
    }

    @GetMapping("/details/class/{className}/term/{term}")
    public List<ExamResult> getResultsByClass(@PathVariable String className, @PathVariable String term) {
        return resultRepository.findByStudent_ClassNameAndTerm(className, term);
    }

    @GetMapping("/details/student/{studentId}/term/{term}")
    public List<ExamResult> getReportCard(@PathVariable Long studentId, @PathVariable String term) {
        return resultRepository.findByStudent_IdAndTerm(studentId, term);
    }

    @GetMapping("/class/{grade}/subject/{subject}/term/{term}")
    public List<ExamResult> getExistingScores(@PathVariable String grade, @PathVariable String subject,
            @PathVariable String term) {
        return resultRepository.findByStudent_GradeLevelAndSubjectAndTerm(grade, subject, term);
    }

    @GetMapping("/ranks/{grade}/{term}")
    public List<Object[]> getClassRanks(@PathVariable String grade, @PathVariable String term) {
        return resultRepository.findClassRanks(grade, term);
    }

    @PostMapping("/bulk")
    public List<ExamResult> saveResults(@RequestBody List<ExamResult> results) {
        for (ExamResult res : results) {
            List<ExamResult> existingRecords = resultRepository.findAllByStudent_IdAndSubjectAndTermAndAcademicYear(
                    res.getStudent().getId(),
                    res.getSubject(),
                    res.getTerm(),
                    res.getAcademicYear());

            if (!existingRecords.isEmpty()) {
                res.setId(existingRecords.get(0).getId());
            }

            double classS = (res.getClassScore() > 0) ? res.getClassScore() : 0;
            double examS = (res.getExamScore() > 0) ? res.getExamScore() : 0;
            double total = classS + examS;
            res.setTotalScore(total);

            if (total >= 80) {
                res.setGrade("1");
                res.setRemarks("Highest Achievement");
            } else if (total >= 75) {
                res.setGrade("2");
                res.setRemarks("Excellent");
            } else if (total >= 70) {
                res.setGrade("3");
                res.setRemarks("Very Good");
            } else if (total >= 65) {
                res.setGrade("4");
                res.setRemarks("Good");
            } else if (total >= 60) {
                res.setGrade("5");
                res.setRemarks("Credit");
            } else if (total >= 55) {
                res.setGrade("6");
                res.setRemarks("Credit");
            } else if (total >= 50) {
                res.setGrade("7");
                res.setRemarks("Pass");
            } else if (total >= 45) {
                res.setGrade("8");
                res.setRemarks("Pass");
            } else {
                res.setGrade("9");
                res.setRemarks("Fail");
            }
        }
        return resultRepository.saveAll(results);
    }

    @PostMapping("/calculate-ranks/{className}/{term}")
    public ResponseEntity<String> calculateRanks(
            @PathVariable String className,
            @PathVariable String term,
            @RequestParam(defaultValue = "2025/2026") String academicYear) {

        resultService.processAndSaveRankings(className, term, academicYear);
        return ResponseEntity.ok("Rankings and class size updated successfully for " + className);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteResult(@PathVariable Long id) {
        resultRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}