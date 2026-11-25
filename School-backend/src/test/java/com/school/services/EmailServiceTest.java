package com.school.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

class EmailServiceTest {

    @Test
    void reportsMissingSmtpCredentialsBeforeAttemptingToSend() {
        EmailService service = new EmailService();

        assertThrows(IllegalStateException.class,
                () -> service.sendSimpleEmail("parent@example.com", "Test", "Test message"));
    }
}
