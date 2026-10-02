package com.school.controllers;

import com.school.dto.PaystackInitializeRequest;
import com.school.dto.PaystackInitializeResponse;
import com.school.services.PaystackService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping(value = "/api/paystack", produces = "application/json")
public class PaystackController {

    private final PaystackService paystackService;

    public PaystackController(PaystackService paystackService) {
        this.paystackService = paystackService;
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        return ResponseEntity.ok(Map.of("configured", paystackService.isConfigured()));
    }

    @PostMapping("/initialize")
    public ResponseEntity<?> initialize(@Valid @RequestBody PaystackInitializeRequest request) {
        try {
            PaystackInitializeResponse response = paystackService.initialize(request.studentId(), request.amount());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message",
                            e.getMessage() == null ? "Unable to initialize online payment." : e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> request) {
        try {
            boolean verified = paystackService.verifyAndRecord(request.get("reference"));
            return verified ? ResponseEntity.ok(Map.of("verified", true))
                    : ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of("verified", false));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message", "Unable to verify payment."));
        }
    }

    @PostMapping(value = "/webhook", consumes = "application/json")
    public ResponseEntity<?> webhook(@RequestBody String rawBody,
            @RequestHeader(value = "x-paystack-signature", required = false) String signature) {
        if (!paystackService.hasValidSignature(rawBody, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid webhook signature."));
        }
        try {
            paystackService.handleWebhook(rawBody);
            return ResponseEntity.ok(Map.of("received", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message", "Webhook processing failed."));
        }
    }
}