package com.school.services;

import com.school.entities.SchoolSettings;
import com.school.repositories.SettingsRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class SmsService {

    @Value("${arkesel.api.key}")
    private String apiKey;

    @Value("${arkesel.sender.id}")
    private String senderId;

    private final SettingsRepository settingsRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public SmsService(SettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    /**
     * Sends a report SMS using the template saved in School Settings
     */
    public void sendReportSms(String phoneNumber, String studentName, String score, String position, String total) {
        // 1. Fetch the template from DB
        SchoolSettings settings = settingsRepository.findAll().stream().findFirst().orElse(new SchoolSettings());
        String template = settings.getReportSmsTemplate();

        if (template == null || template.isEmpty()) {
            template = "Report for {name} is ready. Term: {term}."; // Fallback
        }

        // 2. Replace placeholders
        String message = template
                .replace("{name}", studentName)
                .replace("{term}", settings.getCurrentTerm())
                .replace("{score}", score)
                .replace("{position}", position)
                .replace("{total}", total);

        // 3. Send via Arkesel
        sendSms(phoneNumber, message);
    }

    public void sendSms(String phoneNumber, String message) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl("https://sms.arkesel.com/sms/api")
                    .queryParam("action", "send-sms")
                    .queryParam("api_key", apiKey)
                    .queryParam("to", formatPhoneNumber(phoneNumber))
                    .queryParam("from", senderId)
                    .queryParam("sms", message)
                    .build()
                    .toUriString();

            String response = restTemplate.getForObject(url, String.class);
            System.out.println("Arkesel Response: " + response);

        } catch (Exception e) {
            System.err.println("Failed to send SMS to " + phoneNumber + ": " + e.getMessage());
        }
    }

    private String formatPhoneNumber(String phone) {
        if (phone == null) return "";
        String cleaned = phone.replaceAll("\\s+", "");
        if (cleaned.startsWith("0")) {
            return "233" + cleaned.substring(1);
        }
        return cleaned;
    }
}