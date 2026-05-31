package com.school.controllers;

import com.school.entities.SchoolSettings;
import com.school.repositories.SettingsRepository;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "https://school-management-sytem-seven.vercel.app/:5173")
public class SettingsController {

    private final SettingsRepository settingsRepository;

    public SettingsController(SettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    @GetMapping
    public SchoolSettings getSettings() {
        return settingsRepository.findAll()
                .stream()
                .findFirst()
                .orElse(new SchoolSettings());
    }

    @PostMapping
    public SchoolSettings updateSettings(@RequestBody SchoolSettings settings) {
        Optional<SchoolSettings> existingOpt = settingsRepository.findAll().stream().findFirst();

        if (existingOpt.isPresent()) {
            SchoolSettings existing = existingOpt.get();

            // 1. Update Basic Identity Fields
            existing.setSchoolName(settings.getSchoolName());
            existing.setMotto(settings.getMotto());
            existing.setAddress(settings.getAddress());
            existing.setPhone(settings.getPhone());
            existing.setEmail(settings.getEmail());

            // 2. Update Academic Context
            existing.setAcademicYear(settings.getAcademicYear());
            existing.setCurrentTerm(settings.getCurrentTerm());
            existing.setHeadMasterName(settings.getHeadMasterName());
            existing.setReportSmsTemplate(settings.getReportSmsTemplate());

            // 3. Update Global Images
            existing.setLogoUrl(settings.getLogoUrl());
            existing.setHeadTeacherSign(settings.getHeadTeacherSign());
            existing.setSchoolStamp(settings.getSchoolStamp());

            // 4. SYNC COLLECTION: This handles the multiple Form Masters correctly
            existing.getFormMasters().clear(); // Deletes old entries in form_masters_list
            if (settings.getFormMasters() != null) {
                existing.getFormMasters().addAll(settings.getFormMasters()); // Adds new entries
            }

            return settingsRepository.save(existing);
        } else {
            // Very first time setup
            settings.setId(1L);
            return settingsRepository.save(settings);
        }
    }
}