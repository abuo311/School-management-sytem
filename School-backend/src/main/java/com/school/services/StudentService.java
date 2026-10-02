package com.school.services;

import com.school.entities.Student;
import com.school.repositories.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class StudentService {

    @Autowired
    private StudentRepository studentRepository;

    public List<Student> getAllStudents() {
        return studentRepository.findAllByEnabledTrue();
    }

    // Added to support the new Controller endpoint
    public List<Student> getStudentsByClass(String className) {
        return studentRepository.findByClassNameAndEnabledTrue(className);
    }

    public Student getStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found with id: " + id));
    }

    @Transactional
    public Student saveStudent(Student student) {
        if (student.getId() == null) {
            String requestedAdmissionNumber = student.getAdmissionNumber();
            if (requestedAdmissionNumber == null || requestedAdmissionNumber.isBlank()
                    || studentRepository.existsByAdmissionNumber(requestedAdmissionNumber.trim())) {
                generateDynamicAdmissionNumber(student);
            } else {
                student.setAdmissionNumber(requestedAdmissionNumber.trim());
            }
        }

        return studentRepository.save(student);
    }

    private synchronized void generateDynamicAdmissionNumber(Student student) {
        int currentYear = LocalDate.now().getYear();
        long nextId = studentRepository.count() + 1;
        String generatedID = String.format("ADM-%d-%04d", currentYear, nextId);

        while (studentRepository.existsByAdmissionNumber(generatedID)) {
            nextId++;
            generatedID = String.format("ADM-%d-%04d", currentYear, nextId);
        }

        student.setAdmissionNumber(generatedID);
    }

    @Transactional
    public void archiveStudent(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));
        student.setEnabled(false);
        studentRepository.save(student);
    }

    public long countStudents() {
        return studentRepository.countByEnabledTrue();
    }
}