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
        return studentRepository.findAll();
    }

    // Added to support the new Controller endpoint
    public List<Student> getStudentsByClass(String className) {
        return studentRepository.findByClassName(className);
    }

    public Student getStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found with id: " + id));
    }

    @Transactional
    public Student saveStudent(Student student) {
        // Logic for NEW students only
        if (student.getId() == null && (student.getAdmissionNumber() == null || student.getAdmissionNumber().isEmpty())) {
            generateDynamicAdmissionNumber(student);
        }

        return studentRepository.save(student);
    }

    private void generateDynamicAdmissionNumber(Student student) {
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
    public void deleteStudent(Long id) {
        if (!studentRepository.existsById(id)) {
            throw new RuntimeException("Cannot delete. Student not found with id: " + id);
        }
        studentRepository.deleteById(id);
    }

    public long countStudents() {
        return studentRepository.count();
    }
}