package com.school.controllers;

import com.school.entities.SchoolSettings;
import com.school.dto.SchoolBrandingDto;
import com.school.repositories.SettingsRepository;
import com.school.services.SchoolBrandingService;
import com.school.services.SystemResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;
import java.util.Map;
import java.util.Locale;
import java.util.Objects;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "https://school-management-sytem-seven.vercel.app/:5173")
public class SettingsController {

    private final SettingsRepository settingsRepository;
    private final SchoolBrandingService schoolBrandingService;
    private final SystemResetService systemResetService;

    public SettingsController(SettingsRepository settingsRepository, SchoolBrandingService schoolBrandingService,
                              SystemResetService systemResetService) {
        this.settingsRepository = settingsRepository;
        this.schoolBrandingService = schoolBrandingService;
        this.systemResetService = systemResetService;
    }

    @GetMapping
    public SchoolSettings getSettings() {
        return settingsRepository.findFirstByOrderByIdAsc()
                .orElse(new SchoolSettings());
    }

    @GetMapping("/branding")
    public SchoolBrandingDto getBranding() {
        return schoolBrandingService.getBranding();
    }

    @PostMapping
    public SchoolSettings updateSettings(@RequestBody SchoolSettings settings) {
        Optional<SchoolSettings> existingOpt = settingsRepository.findFirstByOrderByIdAsc();

        if (existingOpt.isPresent()) {
            SchoolSettings existing = existingOpt.get();

            // 1. Update Basic Identity Fields
            String previousSchoolName = existing.getSchoolName();
            String previousStudentIdPrefix = existing.getStudentIdPrefix();
            String requestedStudentIdPrefix = settings.getStudentIdPrefix();
            boolean schoolNameChanged = !Objects.equals(previousSchoolName, settings.getSchoolName());
            boolean prefixUnchanged = requestedStudentIdPrefix == null
                    || requestedStudentIdPrefix.equalsIgnoreCase(previousStudentIdPrefix == null
                            ? ""
                            : previousStudentIdPrefix);
            boolean prefixTracksSchoolName = previousStudentIdPrefix != null
                    && previousStudentIdPrefix.equals(deriveStudentIdPrefix(previousSchoolName));

            existing.setSchoolName(settings.getSchoolName());
            if (schoolNameChanged && prefixUnchanged && prefixTracksSchoolName) {
                existing.setStudentIdPrefix(deriveStudentIdPrefix(settings.getSchoolName()));
            } else if (requestedStudentIdPrefix != null) {
                existing.setStudentIdPrefix(validateStudentIdPrefix(requestedStudentIdPrefix));
            } else if (previousStudentIdPrefix == null || previousStudentIdPrefix.isBlank()) {
                existing.setStudentIdPrefix(deriveStudentIdPrefix(settings.getSchoolName()));
            }
            existing.setMotto(settings.getMotto());
            existing.setAddress(settings.getAddress());
            existing.setPhone(settings.getPhone());
            existing.setEmail(settings.getEmail());

            // 2. Update Academic Context
            existing.setAcademicYear(settings.getAcademicYear());
            existing.setCurrentTerm(settings.getCurrentTerm());
            existing.setHeadMasterName(settings.getHeadMasterName());
            existing.setHeadMasterRemark(settings.getHeadMasterRemark());
            existing.setTeacherRemark(settings.getTeacherRemark());
            existing.setNextTermBegins(settings.getNextTermBegins());
            existing.setNextTermFees(settings.getNextTermFees());
            existing.setReportSmsTemplate(settings.getReportSmsTemplate());
            if (settings.getCanteenFeeAmount() != null) {
                existing.setCanteenFeeAmount(settings.getCanteenFeeAmount());
            }
            if (settings.getCanteenFeeFrequency() != null) {
                existing.setCanteenFeeFrequency(settings.getCanteenFeeFrequency());
            }

            // 3. Update Global Images
            existing.setLogoUrl(settings.getLogoUrl());
            existing.setHeadTeacherSign(settings.getHeadTeacherSign());
            existing.setSchoolStamp(settings.getSchoolStamp());

            // 4. SYNC COLLECTION: This handles the multiple Form Masters correctly
            existing.getFormMasters().clear(); // Deletes old entries in form_masters_list
            if (settings.getFormMasters() != null) {
                existing.getFormMasters().addAll(settings.getFormMasters()); // Adds new entries
            }

            // 5. SYNC STAFF REMARKS COLLECTION
            existing.getStaffRemarks().clear(); // Deletes old entries in staff_remarks_list
            if (settings.getStaffRemarks() != null) {
                existing.getStaffRemarks().addAll(settings.getStaffRemarks()); // Adds new entries
            }

            return settingsRepository.save(existing);
        } else {
            // Very first time setup
            settings.setId(1L);
            settings.setStudentIdPrefix(settings.getStudentIdPrefix() == null
                    ? deriveStudentIdPrefix(settings.getSchoolName())
                    : validateStudentIdPrefix(settings.getStudentIdPrefix()));
            return settingsRepository.save(settings);
        }
    }

    private String validateStudentIdPrefix(String prefix) {
        String normalized = prefix.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z0-9]{1,10}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Student ID prefix must contain 1 to 10 letters or numbers.");
        }
        return normalized;
    }

    private String deriveStudentIdPrefix(String schoolName) {
        String[] words = (schoolName == null ? "" : schoolName.toUpperCase(Locale.ROOT))
                .split("[^A-Z0-9]+");
        StringBuilder prefix = new StringBuilder();
        int wordCount = 0;
        String onlyWord = "";
        for (String word : words) {
            if (!word.isEmpty()) {
                wordCount++;
                onlyWord = word;
                if (prefix.length() < 10) {
                    prefix.append(word.charAt(0));
                }
            }
        }
        if (wordCount == 1) {
            return onlyWord.substring(0, Math.min(3, onlyWord.length()));
        }
        return prefix.length() == 0 ? "SCH" : prefix.toString();
    }

    @PostMapping("/reset-system")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> resetSystem(@RequestBody(required = false) Map<String, String> confirmation) {
        if (confirmation == null || !"RESET".equalsIgnoreCase(confirmation.get("confirmation"))) {
            return ResponseEntity.badRequest().body("Type RESET to confirm the system reset.");
        }

        systemResetService.resetAllSystemData();
        return ResponseEntity.ok(Map.of(
                "message", "System data was reset and school settings restored to defaults.",
                "settings", systemResetService.getDefaultSettings()
        ));
    }
}