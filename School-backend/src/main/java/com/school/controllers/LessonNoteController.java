package com.school.controllers;

import com.school.dto.LessonNoteDto;
import com.school.dto.LessonNoteRequest;
import com.school.services.LessonNoteService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lesson-notes")
public class LessonNoteController {

    private final LessonNoteService lessonNoteService;

    public LessonNoteController(LessonNoteService lessonNoteService) {
        this.lessonNoteService = lessonNoteService;
    }

    @GetMapping
    public List<LessonNoteDto> list(Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return lessonNoteService.list(authentication.getName(), isAdmin(authentication), date);
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication authentication, @RequestBody LessonNoteRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                    lessonNoteService.create(authentication.getName(), isAdmin(authentication), request));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(Authentication authentication, @PathVariable Long id,
            @RequestBody LessonNoteRequest request) {
        try {
            return ResponseEntity.ok(lessonNoteService.update(id, authentication.getName(),
                    isAdmin(authentication), request));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(Authentication authentication, @PathVariable Long id) {
        try {
            lessonNoteService.delete(id, authentication.getName(), isAdmin(authentication));
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}