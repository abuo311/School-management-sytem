package com.school.controllers;

import com.school.entities.ExamResult;
import com.school.repositories.ExamResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/results")
public class ResultDeliveryController {

    private static final Logger logger = LoggerFactory.getLogger(ResultDeliveryController.class);

    // Changed from ResultRepository to ExamResultRepository
    private final ExamResultRepository resultRepository;

    // Constructor Injection updated to match the Repository name
    public ResultDeliveryController(ExamResultRepository resultRepository) {
        this.resultRepository = resultRepository;
    }

    /**
     * Updated to fetch by Class Name using ExamResult entity
     */
    @GetMapping("/class/{className}/term/{term}")
    public ResponseEntity<List<ExamResult>> getResultsByClass(
            @PathVariable String className,
            @PathVariable String term) {
        try {
            // Updated to use the method signature in ExamResultRepository
            List<ExamResult> examResults = resultRepository.findByStudent_ClassNameAndTerm(className, term);

            if (examResults.isEmpty()) {
                logger.warn("No results found for class: {} and term: {}", className, term);
                return ResponseEntity.noContent().build();
            }

            return ResponseEntity.ok(examResults);
        } catch (Exception e) {
            logger.error("Error fetching class results: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Fetch student results using ExamResult entity
     */
    @GetMapping("/details/{studentId}/term/{term}")
    public ResponseEntity<List<ExamResult>> getStudentResults(
            @PathVariable Long studentId,
            @PathVariable String term) {
        try {
            // Updated to use the method signature in ExamResultRepository
            List<ExamResult> examResults = resultRepository.findByStudent_IdAndTerm(studentId, term);
            return ResponseEntity.ok(examResults);
        } catch (Exception e) {
            logger.error("Error fetching student results: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}