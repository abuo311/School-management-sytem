package com.school.repositories;

import com.school.entities.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    // --- CRITICAL FOR SERVICE LAYER ---
    boolean existsByAdmissionNumber(String admissionNumber);

    Optional<Student> findByAdmissionNumber(String admissionNumber);

    // Existing search by grade
    List<Student> findByGradeLevel(String gradeLevel);

    List<Student> findAllByEnabledTrue();

    // Used by ResultDeliveryService and StudentController
    List<Student> findByClassName(String className);

    List<Student> findByClassNameAndEnabledTrue(String className);

    // Case-insensitive version for more reliable class filtering
    List<Student> findByClassNameIgnoreCase(String className);

    List<Student> findByClassNameIgnoreCaseAndEnabledTrue(String className);

    List<Student> findByFirstNameContainingOrLastNameContaining(String firstName, String lastName);

    @Query("SELECT COUNT(s) FROM Student s")
    long countAllStudents();

    long countByEnabledTrue();

    // Custom query to fetch only students who actually HAVE a parent email set
    @Query("SELECT s FROM Student s WHERE s.enabled = true AND s.className = :className AND s.parentEmail IS NOT NULL AND s.parentEmail != ''")
    List<Student> findStudentsWithEmailsByClass(@Param("className") String className);
}