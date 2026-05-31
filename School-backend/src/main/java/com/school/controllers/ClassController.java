package com.school.controllers;

import com.school.entities.SchoolClass;
import com.school.repositories.ClassRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/classes")
@CrossOrigin(origins = "https://school-management-sytem-seven.vercel.app/:5173")
public class ClassController {

    @Autowired
    private ClassRepository classRepository;

    @GetMapping
    public List<SchoolClass> getAll() {
        return classRepository.findAllByOrderByClassNameAsc();
    }

    @PostMapping
    public ResponseEntity<?> add(@RequestBody SchoolClass schoolClass) {
        String name = schoolClass.getClassName().toUpperCase().trim();

        if (classRepository.existsByClassName(name)) {
            return ResponseEntity.badRequest().body("{\"message\": \"This class already exists.\"}");
        }

        schoolClass.setClassName(name);
        // formMasterName is automatically set by @RequestBody if it matches the entity
        // field
        return ResponseEntity.ok(classRepository.save(schoolClass));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody SchoolClass classDetails) {
        return classRepository.findById(id).map(schoolClass -> {
            String newName = classDetails.getClassName().toUpperCase().trim();

            // Check if the name is being changed to something that already exists elsewhere
            if (!schoolClass.getClassName().equals(newName) && classRepository.existsByClassName(newName)) {
                return ResponseEntity.badRequest()
                        .body("{\"message\": \"Another class with this name already exists.\"}");
            }

            // Update fields
            schoolClass.setClassName(newName);

            // CRITICAL: Update the form master name here
            schoolClass.setFormMasterName(classDetails.getFormMasterName());

            SchoolClass updatedClass = classRepository.save(schoolClass);
            return ResponseEntity.ok(updatedClass);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            classRepository.deleteById(id);
            return ResponseEntity.ok().body("{\"message\": \"Class deleted successfully.\"}");
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body("{\"message\": \"Could not delete class. It may be linked to students.\"}");
        }
    }
}