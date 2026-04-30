package com.school.repositories;

import com.school.entities.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {

    // --- NOTIFICATION COMPATIBILITY ---
    List<ExamResult> findByStudent_IdAndTerm(Long studentId, String term);

    // Alias to support the controller's direct call
    default List<ExamResult> findByStudentIdAndTerm(Long studentId, String term) {
        return findByStudent_IdAndTerm(studentId, term);
    }

    // --- EXISTING METHODS ---
    List<ExamResult> findByStudent_ClassNameAndTerm(String className, String term);

    @Query("SELECT er FROM ExamResult er WHERE er.student.className = :grade AND er.subject = :subject AND er.term = :term")
    List<ExamResult> findByClassSubjectAndTerm(
            @Param("grade") String grade,
            @Param("subject") String subject,
            @Param("term") String term
    );

    @Query("SELECT er.student.id, er.student.firstName, er.student.lastName, SUM(er.totalScore) as total " +
            "FROM ExamResult er WHERE er.student.className = :grade AND er.term = :term " +
            "GROUP BY er.student.id ORDER BY total DESC")
    List<Object[]> findClassRanks(@Param("grade") String grade, @Param("term") String term);

    @Query("SELECT er.student.id FROM ExamResult er " +
            "WHERE er.student.gradeLevel = :grade " +
            "AND er.term = :term " +
            "AND er.academicYear = :year " +
            "GROUP BY er.student.id " +
            "ORDER BY SUM(er.totalScore) DESC")
    List<Long> findStudentIdsSortedByTotalScore(@Param("grade") String grade,
                                                @Param("term") String term,
                                                @Param("year") String year);

    List<ExamResult> findByStudent_GradeLevelAndTermAndAcademicYear(String grade, String term, String year);

    List<ExamResult> findByStudent_GradeLevelAndSubjectAndTerm(String gradeLevel, String subject, String term);

    List<ExamResult> findAllByStudent_IdAndSubjectAndTermAndAcademicYear(
            Long studentId,
            String subject,
            String term,
            String academicYear
    );
}