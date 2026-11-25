package com.school.controllers;

import com.school.entities.SchoolSettings;
import com.school.repositories.SettingsRepository;
import com.school.services.SchoolBrandingService;
import com.school.services.SystemResetService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SettingsControllerTest {

    @Test
    void updatesAutomaticallyGeneratedPrefixWhenSchoolNameChanges() {
        SettingsRepository settingsRepository = mock(SettingsRepository.class);
        SchoolSettings existing = new SchoolSettings();
        existing.setSchoolName("Presby Preparatory School");
        existing.setStudentIdPrefix("PPS");
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(existing));
        when(settingsRepository.save(existing)).thenReturn(existing);

        SchoolSettings update = new SchoolSettings();
        update.setSchoolName("Presby College");
        update.setStudentIdPrefix("PPS");

        SettingsController controller = new SettingsController(
                settingsRepository, mock(SchoolBrandingService.class), mock(SystemResetService.class));

        controller.updateSettings(update);

        assertEquals("PC", existing.getStudentIdPrefix());
    }

    @Test
    void preservesManuallyConfiguredPrefixWhenSchoolNameChanges() {
        SettingsRepository settingsRepository = mock(SettingsRepository.class);
        SchoolSettings existing = new SchoolSettings();
        existing.setSchoolName("Presby Preparatory School");
        existing.setStudentIdPrefix("CUSTOM");
        when(settingsRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(existing));
        when(settingsRepository.save(existing)).thenReturn(existing);

        SchoolSettings update = new SchoolSettings();
        update.setSchoolName("Presby College");
        update.setStudentIdPrefix("CUSTOM");

        SettingsController controller = new SettingsController(
                settingsRepository, mock(SchoolBrandingService.class), mock(SystemResetService.class));

        controller.updateSettings(update);

        assertEquals("CUSTOM", existing.getStudentIdPrefix());
    }
}
