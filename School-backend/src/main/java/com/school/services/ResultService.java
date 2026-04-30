package com.school.services;

import com.school.entities.ExamResult;
import com.school.repositories.ExamResultRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResultService {

    private final ExamResultRepository resultRepository;

    public ResultService(ExamResultRepository resultRepository) {
        this.resultRepository = resultRepository;
    }

    /**
     * Calculates rankings based on total scores and updates the database records.
     * This fills the 'position' and 'class_size' columns for each row.
     */
    @Transactional
    public void processAndSaveRankings(String grade, String term, String academicYear) {
        // 1. Fetch the raw ranks (Student ID and their Total Score Sum)
        // Note: Your repository findClassRanks returns Student ID and Total Sum
        List<Object[]> rawRanks = resultRepository.findClassRanks(grade, term);
        int classSize = rawRanks.size();

        // 2. Map student IDs to their rank (Position 1, 2, 3...)
        Map<Long, Integer> studentToRankMap = new HashMap<>();
        for (int i = 0; i < rawRanks.size(); i++) {
            Long studentId = ((Number) rawRanks.get(i)[0]).longValue();
            studentToRankMap.put(studentId, i + 1); // Rank starts at 1
        }

        // 3. Fetch all result rows for this class/term to update them
        List<ExamResult> allResults = resultRepository.findByStudent_ClassNameAndTerm(grade, term);

        // 4. Update each record with the calculated rank and class size
        for (ExamResult result : allResults) {
            Long sId = result.getStudent().getId();
            if (studentToRankMap.containsKey(sId)) {
                result.setPosition(studentToRankMap.get(sId));
                result.setClassSize(classSize);
            }
        }

        // 5. Save all updated rows back to the database
        resultRepository.saveAll(allResults);
    }

    /**
     * Helper to get a simple map of student IDs to their positions.
     */
    public Map<Long, Integer> getStudentRanks(String grade, String term) {
        List<Object[]> rawRanks = resultRepository.findClassRanks(grade, term);
        Map<Long, Integer> ranks = new HashMap<>();

        for (int i = 0; i < rawRanks.size(); i++) {
            Object[] row = rawRanks.get(i);
            Long studentId = ((Number) row[0]).longValue();
            ranks.put(studentId, i + 1);
        }
        return ranks;
    }
}