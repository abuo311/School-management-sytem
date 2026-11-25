package com.school.controllers;

import com.school.dto.TimetableEntryDto;
import com.school.dto.TimetableEntryRequest;
import com.school.services.TimetableService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/timetable")
public class TimetableController {

    private static final Set<String> ADMINISTRATIVE_ROLES = Set.of(
            "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_DIRECTOR", "ROLE_MANAGER");

    private final TimetableService timetableService;

    public TimetableController(TimetableService timetableService) {
        this.timetableService = timetableService;
    }

    @GetMapping
    public List<TimetableEntryDto> list(Authentication authentication) {
        return timetableService.list(authentication.getName(), isAdmin(authentication));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER')")
    public ResponseEntity<?> create(@RequestBody TimetableEntryRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(timetableService.create(request));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody TimetableEntryRequest request) {
        try {
            return ResponseEntity.ok(timetableService.update(id, request));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            timetableService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> ADMINISTRATIVE_ROLES.contains(authority.getAuthority()));
    }
}