package com.school.controllers;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.school.dto.SubscriptionCheckoutRequest;
import com.school.dto.SubscriptionCheckoutResponse;
import com.school.dto.SubscriptionVerifyRequest;
import com.school.services.PaystackService;
import com.school.services.SubscriptionService;
import com.school.services.SubscriptionPlanService;
import com.school.dto.SubscriptionPlanDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping(value = "/api/subscription", produces = "application/json")
public class SubscriptionController {
    private final SubscriptionService subscriptionService;
    private final PaystackService paystackService;
    private final SubscriptionPlanService subscriptionPlanService;

    public SubscriptionController(SubscriptionService subscriptionService, PaystackService paystackService,
                                  SubscriptionPlanService subscriptionPlanService) {
        this.subscriptionService = subscriptionService;
        this.paystackService = paystackService;
        this.subscriptionPlanService = subscriptionPlanService;
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        return ResponseEntity.ok(subscriptionService.getStatus());
    }

    @GetMapping("/plans")
    public ResponseEntity<?> getPlans() {
        return ResponseEntity.ok(subscriptionService.getPlans());
    }

    @PostMapping("/plans")
    public ResponseEntity<?> updatePlans(@RequestBody List<SubscriptionPlanDto> plans) {
        try {
            return ResponseEntity.ok(subscriptionPlanService.updatePlans(plans));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> initializeCheckout(@Valid @RequestBody SubscriptionCheckoutRequest request) {
        try {
            SubscriptionCheckoutResponse response = subscriptionService.initializeCheckout(
                    request.planCode(), request.email());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@Valid @RequestBody SubscriptionVerifyRequest request) {
        try {
            boolean verified = subscriptionService.verifyAndActivate(request.reference());
            return verified
                    ? ResponseEntity.ok(Map.of("verified", true, "status", subscriptionService.getStatus()))
                    : ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of("verified", false));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping(value = "/webhook", consumes = "application/json")
    public ResponseEntity<?> webhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "x-paystack-signature", required = false) String signature) {
        if (!paystackService.hasValidSignature(rawBody, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid webhook signature."));
        }
        try {
            subscriptionService.handleWebhook(rawBody);
            return ResponseEntity.ok(Map.of("received", true));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        } catch (IllegalStateException | RestClientException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Subscription webhook processing failed."));
        } catch (JsonProcessingException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid subscription webhook payload."));
        }
    }
}
