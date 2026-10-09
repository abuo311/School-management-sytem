package com.school.controllers;

import com.school.entities.NonTeachingStaff;
import com.school.repositories.NonTeachingStaffRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/non-teaching-staff")
public class NonTeachingStaffController {

    private final NonTeachingStaffRepository staffRepository;

    public NonTeachingStaffController(NonTeachingStaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    @GetMapping
    public List<NonTeachingStaff> getAll() {
        return staffRepository.findAllByOrderByFullNameAsc();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody NonTeachingStaff staff) {
        if (staff.getFullName() == null || staff.getFullName().isBlank()
                || staff.getPosition() == null || staff.getPosition().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name and position are required."));
        }
        staff.setId(null);
        staff.setFullName(staff.getFullName().trim());
        staff.setPosition(staff.getPosition().trim());
        staff.setActive(true);
        return ResponseEntity.ok(staffRepository.save(staff));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody NonTeachingStaff staffDetails) {
        if (staffDetails.getFullName() == null || staffDetails.getFullName().isBlank()
                || staffDetails.getPosition() == null || staffDetails.getPosition().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name and position are required."));
        }
        return staffRepository.findById(id).map(staff -> {
            staff.setFullName(staffDetails.getFullName().trim());
            staff.setPosition(staffDetails.getPosition().trim());
            if (staffDetails.getProfilePhoto() != null) {
                staff.setProfilePhoto(staffDetails.getProfilePhoto());
            }
            staff.setActive(staffDetails.isActive());
            return ResponseEntity.ok(staffRepository.save(staff));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
