package com.school.controllers;

import com.school.dto.CanteenBalanceDto;
import com.school.dto.CanteenPaymentDto;
import com.school.dto.CanteenPaymentRequest;
import com.school.services.CanteenService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/canteen")
@PreAuthorize("hasAnyRole('ADMIN', 'BURSAR')")
public class CanteenController {

    private final CanteenService canteenService;

    public CanteenController(CanteenService canteenService) {
        this.canteenService = canteenService;
    }

    @GetMapping("/balances")
    public List<CanteenBalanceDto> getBalances() {
        return canteenService.getBalances();
    }

    @GetMapping("/payments/student/{studentId}")
    public List<CanteenPaymentDto> getStudentPayments(@PathVariable Long studentId) {
        return canteenService.getStudentPayments(studentId);
    }

    @PostMapping("/payments")
    public ResponseEntity<?> recordPayment(@RequestBody CanteenPaymentRequest request,
            Authentication authentication) {
        try {
            String receivedBy = authentication == null ? "Staff" : authentication.getName();
            return ResponseEntity.ok(canteenService.recordPayment(request, receivedBy));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }
}
