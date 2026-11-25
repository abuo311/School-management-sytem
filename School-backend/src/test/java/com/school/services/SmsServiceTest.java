package com.school.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.school.repositories.SettingsRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class SmsServiceTest {

    @Test
    void reportsMissingArkeselCredentialsInsteadOfSilentlyDroppingSms() {
        SmsService service = new SmsService(mock(SettingsRepository.class), new ObjectMapper());

        assertThrows(IllegalStateException.class, () -> service.sendSms("0240000000", "Test message"));
    }
}
