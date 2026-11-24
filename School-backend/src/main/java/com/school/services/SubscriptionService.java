package com.school.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.school.dto.SubscriptionCheckoutResponse;
import com.school.dto.SubscriptionPlanDto;
import com.school.dto.SubscriptionStatusDto;
import com.school.entities.Subscription;
import com.school.entities.SubscriptionPayment;
import com.school.entities.SubscriptionStatus;
import com.school.repositories.SubscriptionPaymentRepository;
import com.school.repositories.SubscriptionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SubscriptionService {
    private static final String CURRENCY = "GHS";
    private static final String PENDING = "PENDING";
    private static final String SUCCESS = "SUCCESS";
    private static final String FAILED = "FAILED";

    private final RestClient restClient;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;
    private final SubscriptionPlanService subscriptionPlanService;
    private final String secretKey;
    private final String callbackUrl;

    public SubscriptionService(
            RestClient.Builder restClientBuilder,
            SubscriptionRepository subscriptionRepository,
            SubscriptionPaymentRepository paymentRepository,
            ObjectMapper objectMapper,
            @Value("${paystack.secret-key:}") String secretKey,
            @Value("${paystack.subscription-callback-url:http://localhost:5173/subscription}") String callbackUrl) {
        this(restClientBuilder, subscriptionRepository, paymentRepository, objectMapper, null, secretKey, callbackUrl);
    }

    @Autowired
    public SubscriptionService(
            RestClient.Builder restClientBuilder,
            SubscriptionRepository subscriptionRepository,
            SubscriptionPaymentRepository paymentRepository,
            ObjectMapper objectMapper,
            SubscriptionPlanService subscriptionPlanService,
            @Value("${paystack.secret-key:}") String secretKey,
            @Value("${paystack.subscription-callback-url:http://localhost:5173/subscription}") String callbackUrl) {
        this.restClient = restClientBuilder.baseUrl("https://api.paystack.co").build();
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.objectMapper = objectMapper;
        this.subscriptionPlanService = subscriptionPlanService;
        this.secretKey = secretKey;
        this.callbackUrl = callbackUrl;
    }

    @Transactional
    public SubscriptionStatusDto getStatus() {
        Subscription subscription = findOrStartTrial();
        updateExpiredStatus(subscription, LocalDateTime.now());
        subscriptionRepository.save(subscription);

        String planName = subscription.getPlanCode() == null
                ? null
                : getPlanName(subscription.getPlanCode());
        LocalDateTime accessEndsAt = subscription.getStatus() == SubscriptionStatus.TRIALING
                ? subscription.getTrialEndsAt()
                : subscription.getCurrentPeriodEndsAt();
        return new SubscriptionStatusDto(
                subscription.getStatus().name(),
                subscription.getPlanCode(),
                planName,
                accessEndsAt,
                subscription.isTrialUsed(),
                isConfigured());
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPlanDto> getPlans() {
        return subscriptionPlanService == null
                ? SubscriptionPlan.allPlans()
                : subscriptionPlanService.getPlans();
    }

    @Transactional
    public boolean hasAccess() {
        SubscriptionStatusDto status = getStatus();
        return (SubscriptionStatus.TRIALING.name().equals(status.status())
                || SubscriptionStatus.ACTIVE.name().equals(status.status()))
                && status.accessEndsAt() != null
                && status.accessEndsAt().isAfter(LocalDateTime.now());
    }

    @Transactional
    public SubscriptionCheckoutResponse initializeCheckout(String planCode, String email) {
        requireConfigured();
        SubscriptionPlanDto plan = getPlan(planCode);
        if (email == null || !email.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Enter a valid email address for the Paystack receipt.");
        }

        findOrStartTrial();
        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setReference("SUB-" + UUID.randomUUID());
        payment.setPlanCode(plan.code());
        payment.setAmount(plan.amount());
        payment.setCurrency(CURRENCY);
        payment.setStatus(PENDING);
        payment.setCreatedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("email", email.trim());
        requestBody.put("amount", plan.amount().movePointRight(2).longValueExact());
        requestBody.put("currency", CURRENCY);
        requestBody.put("reference", payment.getReference());
        requestBody.put("callback_url", callbackUrl);
        requestBody.put("metadata", Map.of(
                "subscriptionPlan", plan.code(),
                "billingDurationMonths", plan.durationMonths()));

        JsonNode response;
        try {
            response = restClient.post()
                    .uri("/transaction/initialize")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException exception) {
            throw new IllegalStateException("Unable to initialize subscription checkout with Paystack.", exception);
        }

        JsonNode data = response == null ? null : response.path("data");
        String authorizationUrl = data == null ? "" : data.path("authorization_url").asText();
        if (response == null || !response.path("status").asBoolean(false) || authorizationUrl.isBlank()) {
            throw new IllegalStateException("Paystack could not initialize subscription checkout.");
        }
        return new SubscriptionCheckoutResponse(authorizationUrl, payment.getReference());
    }

    @Transactional
    public boolean verifyAndActivate(String reference) {
        requireConfigured();
        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException("Payment reference is required.");
        }
        paymentRepository.findByReference(reference)
                .orElseThrow(() -> new IllegalArgumentException("Subscription payment reference was not found."));

        JsonNode response = restClient.get()
                .uri("/transaction/verify/{reference}", reference)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                .retrieve()
                .body(JsonNode.class);
        JsonNode data = response == null ? null : response.path("data");
        if (data == null || !"success".equalsIgnoreCase(data.path("status").asText())
                || !reference.equals(data.path("reference").asText())
                || !CURRENCY.equalsIgnoreCase(data.path("currency").asText())) {
            return false;
        }
        BigDecimal amount = BigDecimal.valueOf(data.path("amount").asLong()).movePointLeft(2);
        return recordVerifiedPayment(reference, CURRENCY, amount);
    }

    @Transactional
    boolean recordVerifiedPayment(String reference, String currency, BigDecimal providerAmount) {
        SubscriptionPayment payment = paymentRepository.findByReferenceForUpdate(reference)
                .orElseThrow(() -> new IllegalArgumentException("Subscription payment reference was not found."));
        if (SUCCESS.equals(payment.getStatus())) {
            return true;
        }
        if (!PENDING.equals(payment.getStatus())) {
            return false;
        }
        if (!payment.getCurrency().equalsIgnoreCase(currency)
                || payment.getAmount().compareTo(providerAmount) != 0) {
            payment.setStatus(FAILED);
            paymentRepository.save(payment);
            return false;
        }

        Subscription subscription = subscriptionRepository.findByIdForUpdate(Subscription.SINGLE_SCHOOL_ID)
                .orElseGet(this::findOrStartTrial);
        LocalDateTime now = LocalDateTime.now();
        updateExpiredStatus(subscription, now);
        LocalDateTime periodStart = subscription.getStatus() == SubscriptionStatus.ACTIVE
                        && subscription.getCurrentPeriodEndsAt() != null
                        && subscription.getCurrentPeriodEndsAt().isAfter(now)
                ? subscription.getCurrentPeriodEndsAt()
                : now;
        SubscriptionPlanDto plan = getPlan(payment.getPlanCode());
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setPlanCode(plan.code());
        subscription.setCurrentPeriodStartsAt(periodStart);
        subscription.setCurrentPeriodEndsAt(periodStart.plusMonths(plan.durationMonths()));
        subscriptionRepository.save(subscription);

        payment.setStatus(SUCCESS);
        payment.setPaidAt(now);
        paymentRepository.save(payment);
        return true;
    }

    @Transactional
    public boolean handleWebhook(String rawBody) throws JsonProcessingException {
        JsonNode event = objectMapper.readTree(rawBody);
        if (!"charge.success".equals(event.path("event").asText())) {
            return false;
        }
        String reference = event.path("data").path("reference").asText();
        return verifyAndActivate(reference);
    }

    public boolean isConfigured() {
        return !secretKey.isBlank();
    }

    private Subscription findOrStartTrial() {
        return subscriptionRepository.findById(Subscription.SINGLE_SCHOOL_ID)
                .orElseGet(() -> {
                    LocalDateTime startedAt = LocalDateTime.now();
                    Subscription subscription = new Subscription();
                    subscription.setId(Subscription.SINGLE_SCHOOL_ID);
                    subscription.setStatus(SubscriptionStatus.TRIALING);
                    subscription.setTrialUsed(true);
                    subscription.setTrialStartedAt(startedAt);
                    subscription.setTrialEndsAt(startedAt.plusMonths(1));
                    return subscriptionRepository.saveAndFlush(subscription);
                });
    }

    private void updateExpiredStatus(Subscription subscription, LocalDateTime now) {
        LocalDateTime endsAt = subscription.getStatus() == SubscriptionStatus.TRIALING
                ? subscription.getTrialEndsAt()
                : subscription.getCurrentPeriodEndsAt();
        if ((subscription.getStatus() == SubscriptionStatus.TRIALING
                || subscription.getStatus() == SubscriptionStatus.ACTIVE)
                && (endsAt == null || !endsAt.isAfter(now))) {
            subscription.setStatus(SubscriptionStatus.EXPIRED);
        }
    }

    private SubscriptionPlanDto getPlan(String planCode) {
        if (subscriptionPlanService != null) {
            return subscriptionPlanService.getPlan(planCode);
        }
        return SubscriptionPlan.fromCode(planCode).toDto();
    }

    private String getPlanName(String planCode) {
        try {
            return getPlan(planCode).name();
        } catch (IllegalArgumentException exception) {
            return SubscriptionPlan.fromCode(planCode).planName();
        }
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new IllegalStateException("Paystack is not configured. Set PAYSTACK_SECRET_KEY on the backend.");
        }
    }
}
