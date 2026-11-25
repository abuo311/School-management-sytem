package com.school.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String senderAddress;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public void sendSimpleEmail(String to, String subject, String body) {
        requireConfiguration();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true); // Set to 'true' to enable HTML if needed

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }

    public void sendEmailWithAttachment(String to, String subject, String body, byte[] attachment, String fileName) {
        requireConfiguration();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(senderAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true);
            helper.addAttachment(fileName, new org.springframework.core.io.ByteArrayResource(attachment));
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Email failed: " + e.getMessage());
        }
    }
    private void requireConfiguration() {
        if (!StringUtils.hasText(senderAddress) || !StringUtils.hasText(mailPassword)) {
            throw new IllegalStateException(
                    "SMTP email is not configured. Set SPRING_MAIL_USERNAME and SPRING_MAIL_PASSWORD.");
        }
    }
}