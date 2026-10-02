package com.school.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.school.entities.FeeAssessment;
import com.school.entities.FeePayment;
import com.school.entities.PaystackTransaction;
import com.school.entities.Student;
import com.school.repositories.FeeAssessmentRepository;
import com.school.repositories.FeeRepository;
import com.school.repositories.PaystackTransactionRepository;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaystackServiceTest {

    private static final String SECRET = "test-secret-key";
    private final RestClient.Builder restClientBuilder = mock(RestClient.Builder.class);
    private final FeeAssessmentRepository assessmentRepository = mock(FeeAssessmentRepository.class);
    private final FeeRepository feeRepository = mock(FeeRepository.class);
    private final PaystackTransactionRepository transactionRepository = mock(PaystackTransactionRepository.class);
    private final StudentRepository studentRepository = mock(StudentRepository.class);
    private final SettingsRepository settingsRepository = mock(SettingsRepository.class);
    private PaystackService service;

    @BeforeEach
    void configureRestClientBuilder() {
        when(restClientBuilder.baseUrl(anyString())).thenReturn(restClientBuilder);
        when(restClientBuilder.build()).thenReturn(mock(RestClient.class));
        service = new PaystackService(restClientBuilder, new ObjectMapper(), assessmentRepository, feeRepository,
                transactionRepository, studentRepository, settingsRepository, SECRET, "GHS",
                "https://school.test/fees");
    }

    @Test
    void validatesWebhookSignatureUsingPaystackHmac() throws Exception {
        String body = "{\"event\":\"charge.success\"}";
        Mac mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        String signature = HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));

        assertTrue(service.hasValidSignature(body, signature));
        org.junit.jupiter.api.Assertions.assertFalse(service.hasValidSignature(body, "invalid"));
    }

    @Test
    void recordsVerifiedPaymentOnlyOnce() {
        Student student = new Student();
        student.setId(42L);

        PaystackTransaction transaction = new PaystackTransaction();
        transaction.setReference("SCHOOL-reference");
        transaction.setStudent(student);
        transaction.setTerm("Term 2");
        transaction.setAcademicYear("2026/2027");
        transaction.setAmount(new BigDecimal("100.00"));
        transaction.setStatus("PENDING");
        when(transactionRepository.findByReferenceForUpdate("SCHOOL-reference"))
                .thenReturn(Optional.of(transaction));

        FeeAssessment assessment = new FeeAssessment();
        assessment.setAssessedAmount(new BigDecimal("300.00"));
        when(assessmentRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(Optional.of(assessment));
        when(feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                42L, "Term 2", "2026/2027")).thenReturn(List.of());

        assertTrue(service.recordVerifiedPayment("SCHOOL-reference", new BigDecimal("100.00")));
        assertTrue(service.recordVerifiedPayment("SCHOOL-reference", new BigDecimal("100.00")));

        var paymentCaptor = org.mockito.ArgumentCaptor.forClass(FeePayment.class);
        verify(feeRepository, times(1)).save(paymentCaptor.capture());
        assertEquals(200.0, paymentCaptor.getValue().getBalance());
        assertEquals("Paystack", paymentCaptor.getValue().getPaymentMethod());
        assertEquals("SUCCESS", transaction.getStatus());
    }
}
