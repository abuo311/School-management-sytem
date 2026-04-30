package com.school.services;

import com.school.entities.ExamResult;
import com.school.entities.Student;
import com.school.repositories.ExamResultRepository;
import com.school.repositories.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RankingService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private ExamResultRepository resultRepository; // Changed from ResultRepository

    /**
     * Calculates and saves positions for all students in a class.
     */
    @Transactional
    public void calculateClassPositions(String className, String term, String academicYear) {
        // 1. Fetch all students in that class
        List<Student> students = studentRepository.findByClassName(className);
        int classSize = students.size();

        // 2. Fetch their results and sort by Total Score (Descending)
        // We use the new findAllBy... method which handles duplicates safely
        List<ExamResult> classResults = students.stream()
                .map(s -> resultRepository.findAllByStudent_IdAndSubjectAndTermAndAcademicYear(
                        s.getId(), null, term, academicYear))
                .filter(list -> !list.isEmpty())
                .map(list -> list.get(0)) // Take the first result if multiple exist
                .sorted(Comparator.comparing(ExamResult::getTotalScore).reversed())
                .collect(Collectors.toList());

        // 3. Assign positions
        for (int i = 0; i < classResults.size(); i++) {
            ExamResult res = classResults.get(i);
            res.setPosition(i + 1); // Rank starts at 1
            res.setClassSize(classSize);

            // Using TotalScore since your entity uses totalScore instead of average
            res.setRemarks(generateRemarks(res.getTotalScore()));

            resultRepository.save(res);
        }
    }

    private String generateRemarks(Double score) {
        if (score == null) return "No data";
        if (score >= 80) return "Excellent Performance";
        if (score >= 70) return "Very Good";
        if (score >= 50) return "Credit Pass";
        return "Needs Improvement";
    }
}