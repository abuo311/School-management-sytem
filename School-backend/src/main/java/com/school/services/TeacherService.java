package com.school.services;

import com.school.entities.Teacher;
import com.school.entities.User;
import com.school.repositories.TeacherRepository;
import com.school.repositories.UserRepository; // New import
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository; // Added to find the User entity

    public TeacherService(TeacherRepository teacherRepository, UserRepository userRepository) {
        this.teacherRepository = teacherRepository;
        this.userRepository = userRepository;
    }

    public List<Teacher> getAllTeachers() {
        return teacherRepository.findAll();
    }

    public Teacher saveTeacher(Teacher teacher) {
        // Handle the User linking for new Teachers
        if (teacher.getUser() != null && teacher.getUser().getId() != null) {
            User existingUser = userRepository.findById(teacher.getUser().getId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + teacher.getUser().getId()));
            teacher.setUser(existingUser);
        }
        return teacherRepository.save(teacher);
    }

    public Teacher updateTeacher(Long id, Teacher teacherDetails) {
        return teacherRepository.findById(id).map(teacher -> {
            teacher.setFirstName(teacherDetails.getFirstName());
            teacher.setLastName(teacherDetails.getLastName());
            teacher.setEmail(teacherDetails.getEmail());
            teacher.setSpecialization(teacherDetails.getSpecialization());
            
            // Handle User linking for updates
            if (teacherDetails.getUser() != null && teacherDetails.getUser().getId() != null) {
                User existingUser = userRepository.findById(teacherDetails.getUser().getId())
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + teacherDetails.getUser().getId()));
                teacher.setUser(existingUser);
            }
            
            return teacherRepository.save(teacher);
        }).orElseThrow(() -> new RuntimeException("Teacher not found with id " + id));
    }

    public void deleteTeacher(Long id) {
        teacherRepository.deleteById(id);
    }
}