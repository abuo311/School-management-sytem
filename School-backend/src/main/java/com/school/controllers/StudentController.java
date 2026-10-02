package com.school.controllers;

import com.school.entities.Student;
import com.school.dto.StudentContactUpdateRequest;
import com.school.services.StudentService;
import com.school.services.FeeService;
import com.school.services.FeeAssessmentService;
import com.school.repositories.StudentRepository;
import com.school.repositories.SettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType; // Added
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "https://school-management-sytem-seven.vercel.app/:5173", methods = { RequestMethod.GET,
        RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE })
public class StudentController {

    private static final Logger logger = LoggerFactory.getLogger(StudentController.class);
    private final StudentService studentService;
    private final StudentRepository studentRepository;
    private final FeeService feeService;
    private final FeeAssessmentService feeAssessmentService;
    private final SettingsRepository settingsRepository;

    public StudentController(StudentService studentService, StudentRepository studentRepository,
            FeeService feeService, FeeAssessmentService feeAssessmentService, SettingsRepository settingsRepository) {
        this.studentService = studentService;
        this.studentRepository = studentRepository;
        this.feeService = feeService;
        this.feeAssessmentService = feeAssessmentService;
        this.settingsRepository = settingsRepository;
    }

    private List<Student> addCurrentFeeBalances(List<Student> students) {
        var settings = settingsRepository.findFirstByOrderByIdAsc().orElse(null);
        String term = settings != null && settings.getCurrentTerm() != null ? settings.getCurrentTerm() : "Term 1";
        String academicYear = settings != null && settings.getAcademicYear() != null
                ? settings.getAcademicYear()
                : "2025/2026";
        feeAssessmentService.ensureCurrentTermAssessments();
        students.forEach(student -> {
            student.setCurrentFeeTerm(term);
            student.setCurrentFeeAcademicYear(academicYear);
            student.setCurrentFeeAssessedAmount(feeAssessmentService
                    .getAssessedAmount(student.getId(), term, academicYear).doubleValue());
            student.setCurrentFeeBalance(feeService.getCurrentBalance(student.getId(), term, academicYear));
        });
        return students;
    }

    @GetMapping("/class/{className}")
    public ResponseEntity<List<Student>> getStudentsByClass(@PathVariable String className) {
        try {
            logger.info("Fetching students for class: {}", className);
            List<Student> students = studentRepository.findByClassNameAndEnabledTrue(className);
            if (students.isEmpty())
                return ResponseEntity.noContent().build();
            return ResponseEntity.ok(addCurrentFeeBalances(students));
        } catch (Exception e) {
            logger.error("Error fetching students for class: " + className, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/next-admission-number")
    public ResponseEntity<Long> getNextAdmissionNumber() {
        try {
            long nextCount = studentRepository.count() + 1;
            return ResponseEntity.ok(nextCount);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<Student>> getAllStudents() {
        try {
            return ResponseEntity.ok(addCurrentFeeBalances(studentService.getAllStudents()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // --- UPDATED: Added explicit MediaType and logging for debugging ---
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateStudent(@PathVariable Long id, @RequestBody Student details) {
        try {
            logger.info("Updating student ID: {} - Photo length: {}", id,
                    details.getStudentPhoto() != null ? details.getStudentPhoto().length() : 0);

            return studentRepository.findById(id).map(student -> {
                student.setFirstName(details.getFirstName());
                student.setLastName(details.getLastName());
                student.setGender(details.getGender());
                student.setClassName(details.getClassName());
                student.setGradeLevel(details.getGradeLevel());
                student.setDateOfBirth(details.getDateOfBirth());
                student.setAdmissionNumber(details.getAdmissionNumber());
                student.setStudentPhoto(details.getStudentPhoto());
                student.setParentName(details.getParentName());
                student.setParentContact(details.getParentContact());
                student.setParentEmail(details.getParentEmail());
                student.setHomeAddress(details.getHomeAddress());

                Student updated = studentRepository.save(student);
                return ResponseEntity.ok(updated);
            }).orElse(ResponseEntity.notFound().build());

        } catch (Exception e) {
            logger.error("Error updating student", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Update failed: " + e.getMessage()));
        }
    }

    @PatchMapping("/{id}/contact")
    public ResponseEntity<?> updateStudentContact(@PathVariable Long id,
            @RequestBody StudentContactUpdateRequest request) {
        return studentRepository.findById(id).map(student -> {
            student.setParentContact(request.parentContact());
            return ResponseEntity.ok(studentRepository.save(student));
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- UPDATED: Added explicit MediaType ---
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createStudent(@RequestBody Student student) {
        try {
            logger.info("Creating student: {} {}", student.getFirstName(), student.getLastName());
            Student saved = studentService.saveStudent(student);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("Error creating student", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error saving record. Check if admission number is unique."));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStudent(@PathVariable Long id) {
        try {
            studentService.archiveStudent(id);
            return ResponseEntity
                    .ok(Map.of("message", "Student archived. Attendance, fee and academic records were retained."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error archiving student ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Unable to archive student."));
        }
    }

    @GetMapping("/classes")
    public ResponseEntity<List<String>> getAllUniqueClasses() {
        try {
            List<String> classes = studentRepository.findAllByEnabledTrue()
                    .stream()
                    .map(s -> s.getClassName() != null ? s.getClassName() : s.getGradeLevel())
                    .filter(c -> c != null && !c.trim().isEmpty())
                    .distinct()
                    .collect(Collectors.toList());
            return ResponseEntity.ok(classes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Student> getStudentById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(studentService.getStudentById(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}