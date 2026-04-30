package com.school.controllers;

import com.school.entities.Subject;
import com.school.entities.User; // Ensure this is imported
import com.school.repositories.SubjectRepository;
import com.school.repositories.UserRepository; // You'll need this to find the user
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subjects")
@CrossOrigin(origins = "http://localhost:5173")
public class SubjectController {

    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository; // Added UserRepository

    public SubjectController(SubjectRepository subjectRepository, UserRepository userRepository) {
        this.subjectRepository = subjectRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> addSubject(@RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        String subjectCode = (String) payload.get("subjectCode");
        String category = (String) payload.get("category");
        Long userId = payload.get("userId") != null ? Long.valueOf(payload.get("userId").toString()) : null;

        if (subjectRepository.existsByName(name)) {
            return ResponseEntity.badRequest().body("Subject name already exists");
        }

        Subject subject = new Subject();
        subject.setName(name);
        subject.setSubjectCode(subjectCode);
        subject.setCategory(category);

        if (userId != null) {
            userRepository.findById(userId).ifPresent(subject::setUser);
        }

        return ResponseEntity.ok(subjectRepository.save(subject));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSubject(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        return subjectRepository.findById(id).map(subject -> {
            subject.setName((String) payload.get("name"));
            subject.setSubjectCode((String) payload.get("subjectCode"));
            subject.setCategory((String) payload.get("category"));

            // Update assigned staff
            if (payload.get("userId") != null) {
                Long userId = Long.valueOf(payload.get("userId").toString());
                userRepository.findById(userId).ifPresent(subject::setUser);
            } else {
                subject.setUser(null); // Unassign if no ID is sent
            }

            subjectRepository.save(subject);
            return ResponseEntity.ok(subject);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSubject(@PathVariable Long id) {
        try {
            subjectRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Could not delete subject");
        }
    }
}