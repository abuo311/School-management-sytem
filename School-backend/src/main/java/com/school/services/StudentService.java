package com.school.services;

import com.school.entities.Student;
import com.school.entities.SchoolSettings;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class StudentService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SettingsRepository settingsRepository;

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
        String prefix = settingsRepository.findFirstByOrderByIdAsc()
                .map(SchoolSettings::getStudentIdPrefix)
                .filter(configuredPrefix -> !configuredPrefix.isBlank())
                .orElse("PPS")
                .trim()
                .toUpperCase(java.util.Locale.ROOT);
        long nextId = studentRepository.countByAdmissionNumberStartingWith(prefix + "-") + 1;
        String generatedID = String.format("%s-%04d", prefix, nextId);

        while (studentRepository.existsByAdmissionNumber(generatedID)) {
            nextId++;
            generatedID = String.format("%s-%04d", prefix, nextId);
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