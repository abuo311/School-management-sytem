package com.school.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.school.dto.FeeBalanceDto;
import com.school.dto.PaystackInitializeResponse;
import com.school.entities.FeeAssessment;
import com.school.entities.FeePayment;
import com.school.entities.PaystackTransaction;
import com.school.repositories.FeeAssessmentRepository;
import com.school.repositories.FeeRepository;
import com.school.repositories.PaystackTransactionRepository;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class PaystackService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final FeeAssessmentRepository assessmentRepository;
    private final FeeRepository feeRepository;
    private final PaystackTransactionRepository transactionRepository;
    private final StudentRepository studentRepository;
    private final SettingsRepository settingsRepository;
    private final String secretKey;
    private final String currency;
    private final String callbackUrl;

    public PaystackService(RestClient.Builder restClientBuilder, ObjectMapper objectMapper,
            FeeAssessmentRepository assessmentRepository, FeeRepository feeRepository,
            PaystackTransactionRepository transactionRepository, StudentRepository studentRepository,
            SettingsRepository settingsRepository,
            @Value("${paystack.secret-key:}") String secretKey,
            @Value("${paystack.currency:GHS}") String currency,
            @Value("${paystack.callback-url:http://localhost:5173/dashboard/fees}") String callbackUrl) {
        this.restClient = restClientBuilder.baseUrl("https://api.paystack.co").build();
        this.objectMapper = objectMapper;
        this.assessmentRepository = assessmentRepository;
        this.feeRepository = feeRepository;
        this.transactionRepository = transactionRepository;
        this.studentRepository = studentRepository;
        this.settingsRepository = settingsRepository;
        this.secretKey = secretKey;
        this.currency = currency;
        this.callbackUrl = callbackUrl;
    }

    @Transactional
    public PaystackInitializeResponse initialize(Long studentId, BigDecimal requestedAmount) {
        requireConfigured();
        var settings = settingsRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new IllegalArgumentException("School settings are not configured."));
        var student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Learner was not found."));
        if (student.getParentEmail() == null || student.getParentEmail().isBlank()) {
            throw new IllegalArgumentException("Add a parent or guardian email before starting online payment.");
        }
        String term = settings.getCurrentTerm();
        String year = settings.getAcademicYear();
        FeeAssessment assessment = assessmentRepository
                .findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(studentId, term, year)
                .orElseThrow(
                        () -> new IllegalArgumentException("Fees have not been issued for this learner and term."));
        BigDecimal paid = feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(studentId, term, year)
                .stream().map(payment -> BigDecimal.valueOf(payment.getAmountPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal outstanding = assessment.getAssessedAmount().subtract(paid).max(BigDecimal.ZERO);
        BigDecimal amount = requestedAmount.setScale(2, RoundingMode.HALF_UP);
        if (amount.signum() <= 0 || amount.compareTo(outstanding) > 0) {
            throw new IllegalArgumentException("Payment must be positive and no greater than the outstanding balance.");
        }

        String reference = "SCHOOL-" + UUID.randomUUID();
        PaystackTransaction transaction = new PaystackTransaction();
        transaction.setReference(reference);
        transaction.setStudent(student);
        transaction.setTerm(term);
        transaction.setAcademicYear(year);
        transaction.setAmount(amount);
        transaction.setStatus("PENDING");
        transaction.setCreatedAt(LocalDateTime.now());
        transactionRepository.save(transaction);

        long minorAmount = amount.movePointRight(2).longValueExact();
        JsonNode response = restClient.post()
                .uri("/transaction/initialize")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                .body(Map.of(
                        "email", student.getParentEmail(),
                        "amount", minorAmount,
                        "currency", currency,
                        "reference", reference,
                        "callback_url", callbackUrl))
                .retrieve()
                .body(JsonNode.class);
        if (response == null || !response.path("status").asBoolean(false)
                || response.path("data").path("authorization_url").isMissingNode()) {
            transaction.setStatus("FAILED");
            throw new IllegalStateException("Paystack could not initialize this payment.");
        }
        return new PaystackInitializeResponse(
                response.path("data").path("authorization_url").asText(), reference);
    }

    @Transactional
    public boolean verifyAndRecord(String reference) {
        requireConfigured();
        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException("Payment reference is required.");
        }
        JsonNode response = restClient.get()
                .uri("/transaction/verify/{reference}", reference)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                .retrieve()
                .body(JsonNode.class);
        JsonNode data = response == null ? null : response.path("data");
        if (data == null || !"success".equalsIgnoreCase(data.path("status").asText())
                || !reference.equals(data.path("reference").asText())
                || !currency.equalsIgnoreCase(data.path("currency").asText())) {
            return false;
        }
        BigDecimal paidAmount = BigDecimal.valueOf(data.path("amount").asLong()).movePointLeft(2);
        return recordVerifiedPayment(reference, paidAmount);
    }

    public boolean hasValidSignature(String rawBody, String signature) {
        if (secretKey.isBlank() || rawBody == null || signature == null) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] expected = HexFormat.of().formatHex(mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8)))
                    .getBytes(StandardCharsets.US_ASCII);
            return MessageDigest.isEqual(expected, signature.getBytes(StandardCharsets.US_ASCII));
        } catch (Exception exception) {
            return false;
        }
    }

    public void handleWebhook(String rawBody) throws Exception {
        JsonNode event = objectMapper.readTree(rawBody);
        if (!"charge.success".equals(event.path("event").asText())) {
            return;
        }
        String reference = event.path("data").path("reference").asText();
        verifyAndRecord(reference);
    }

    @Transactional
    protected boolean recordVerifiedPayment(String reference, BigDecimal providerAmount) {
        PaystackTransaction transaction = transactionRepository.findByReferenceForUpdate(reference)
                .orElseThrow(() -> new IllegalArgumentException("Payment reference was not initiated by this school."));
        if ("SUCCESS".equals(transaction.getStatus())) {
            return true;
        }
        if (!"PENDING".equals(transaction.getStatus()) || providerAmount.compareTo(transaction.getAmount()) != 0) {
            transaction.setStatus("FAILED");
            return false;
        }

        FeeAssessment assessment = assessmentRepository
                .findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                        transaction.getStudent().getId(), transaction.getTerm(), transaction.getAcademicYear())
                .orElseThrow(() -> new IllegalStateException("The assessed term fee no longer exists."));
        var payments = feeRepository.findByStudentIdAndTermIgnoreCaseAndAcademicYearIgnoreCase(
                transaction.getStudent().getId(), transaction.getTerm(), transaction.getAcademicYear());
        double previousPaid = payments.stream().mapToDouble(FeePayment::getAmountPaid).sum();
        double amount = providerAmount.doubleValue();
        FeePayment payment = new FeePayment();
        payment.setStudent(transaction.getStudent());
        payment.setTerm(transaction.getTerm());
        payment.setAcademicYear(transaction.getAcademicYear());
        payment.setTotalBill(assessment.getAssessedAmount().doubleValue());
        payment.setAmountPaid(amount);
        payment.setBalance(Math.max(0, payment.getTotalBill() - previousPaid - amount));
        payment.setDatePaid(LocalDate.now());
        payment.setPaymentMethod("Paystack");
        payment.setReceivedBy("Paystack");
        feeRepository.save(payment);

        transaction.setStatus("SUCCESS");
        transaction.setPaidAt(LocalDateTime.now());
        transactionRepository.save(transaction);
        return true;
    }

    private void requireConfigured() {
        if (secretKey.isBlank()) {
            throw new IllegalStateException("Paystack is not configured. Set PAYSTACK_SECRET_KEY on the backend.");
        }
    }

    public boolean isConfigured() {
        return !secretKey.isBlank();
    }
}