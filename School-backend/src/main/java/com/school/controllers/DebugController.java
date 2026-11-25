package com.school.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

import java.util.Map;

@RestController
public class DebugController {

    @Value("${spring.mail.username:}")
    private String emailUsername;

    @Value("${spring.mail.password:}")
    private String emailPassword;

    @Value("${arkesel.api.key:}")
    private String arkeselKey;

    @Value("${arkesel.sender.id:}")
    private String arkeselSenderId;

    @GetMapping("/api/debug/check-config")
    public Map<String, Boolean> checkConfig() {
        return Map.of(
                "emailConfigured", StringUtils.hasText(emailUsername) && StringUtils.hasText(emailPassword),
                "smsConfigured", StringUtils.hasText(arkeselKey) && StringUtils.hasText(arkeselSenderId));
    }
}