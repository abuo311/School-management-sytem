package com.school.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DebugController {

    @Value("${spring.mail.username}")
    private String email;

    @Value("${arkesel.api.key}")
    private String arkeselKey;

    @GetMapping("/api/debug/check-config")
    public String checkConfig() {
        // This will print the first 3 letters of your keys to your browser 
        // so you can verify the app is actually reading your new settings.
        return "Email is: " + email +
                " | Arkesel Key starts with: " + arkeselKey.substring(0, 3) + "...";
    }
}