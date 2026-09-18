package com.school.controllers;

import com.school.services.BackupService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Path;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = BackupController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class
        }
)
@AutoConfigureMockMvc(addFilters = false)
class BackupControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BackupService backupService;

    @Test
    void shouldReturnBackupFileWhenBackupIsCreated() throws Exception {

        // Arrange
        Path backupPath = Path.of("backups/test_backup.sql");

        when(backupService.createDatabaseBackup())
                .thenReturn(backupPath);

        // Act + Assert
        mockMvc.perform(
                        post("/api/backup")
                                .contentType(MediaType.APPLICATION_JSON)
                )
                .andExpect(status().isOk())
                .andExpect(
                        header().string(
                                "Content-Disposition",
                                org.hamcrest.Matchers.containsString(
                                        "attachment; filename=\"test_backup.sql\""
                                )
                        )
                )
                .andExpect(
                        header().string(
                                "Content-Type",
                                MediaType.APPLICATION_OCTET_STREAM_VALUE
                        )
                );
    }
}