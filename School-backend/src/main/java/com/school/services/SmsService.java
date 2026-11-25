package com.school.services;

import com.school.entities.SchoolSettings;
import com.school.repositories.SettingsRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Service
public class SmsService {

    @Value("${arkesel.api.key:}")
    private String apiKey;

    @Value("${arkesel.sender.id:}")
    private String senderId;

    @Value("${arkesel.api.url:https://sms.arkesel.com/sms/api}")
    private String apiUrl;

    private final SettingsRepository settingsRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;

    public SmsService(SettingsRepository settingsRepository, ObjectMapper objectMapper) {
        this.settingsRepository = settingsRepository;
        this.objectMapper = objectMapper;
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
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(senderId) || !StringUtils.hasText(apiUrl)) {
            throw new IllegalStateException(
                    "Arkesel SMS is not configured. Set ARKESEL_API_KEY and ARKESEL_SENDER_ID.");
        }
        String recipient = formatPhoneNumber(phoneNumber);
        if (!StringUtils.hasText(recipient)) {
            throw new IllegalArgumentException("A phone number is required to send SMS.");
        }

        URI uri = UriComponentsBuilder.fromUriString(apiUrl.trim())
                .queryParam("action", "send-sms")
                .queryParam("api_key", apiKey.trim())
                .queryParam("to", recipient)
                .queryParam("from", senderId.trim())
                .queryParam("sms", message)
                .queryParam("response", "json")
                .build()
                .encode()
                .toUri();

        String response = restTemplate.getForObject(uri, String.class);
        if (!isSuccessfulResponse(response)) {
            throw new IllegalStateException("Arkesel did not accept the SMS request.");
        }
    }

    private boolean isSuccessfulResponse(String response) {
        if (!StringUtils.hasText(response)) {
            return false;
        }
        String body = response.trim();
        if ("OK".equalsIgnoreCase(body)) {
            return true;
        }
        try {
            JsonNode result = objectMapper.readTree(body);
            return "ok".equalsIgnoreCase(result.path("code").asText())
                    || "success".equalsIgnoreCase(result.path("status").asText())
                    || "successfully sent".equalsIgnoreCase(result.path("message").asText())
                    || (result.isTextual() && "OK".equalsIgnoreCase(result.asText()));
        } catch (JsonProcessingException exception) {
            return false;
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