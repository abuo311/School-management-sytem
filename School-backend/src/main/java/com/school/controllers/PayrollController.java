package com.school.controllers;

import com.school.dto.PayrollEmployeeDto;
import com.school.dto.PayrollPaymentRequest;
import com.school.dto.PayrollRecordDto;
import com.school.dto.PayrollRecordRequest;
import com.school.services.PayrollService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payroll")
public class PayrollController {

    private final PayrollService payrollService;

    public PayrollController(PayrollService payrollService) {
        this.payrollService = payrollService;
    }

    @GetMapping("/employees")
    public List<PayrollEmployeeDto> getEmployees() {
        return payrollService.getEmployees();
    }

    @GetMapping
    public ResponseEntity<?> getRecords(
            @RequestParam int year,
            @RequestParam int month) {
        try {
            return ResponseEntity.ok(payrollService.getRecords(year, month));
        } catch (IllegalArgumentException exception) {
            return badRequest(exception);
        }
    }

    @PostMapping
    public ResponseEntity<?> createRecord(@Valid @RequestBody PayrollRecordRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(payrollService.createRecord(request));
        } catch (IllegalArgumentException exception) {
            return badRequest(exception);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRecord(
            @PathVariable Long id,
            @Valid @RequestBody PayrollRecordRequest request) {
        try {
            return ResponseEntity.ok(payrollService.updateRecord(id, request));
        } catch (IllegalArgumentException exception) {
            return badRequest(exception);
        }
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<?> markPaid(
            @PathVariable Long id,
            @Valid @RequestBody PayrollPaymentRequest request) {
        try {
            return ResponseEntity.ok(payrollService.markPaid(id, request));
        } catch (IllegalArgumentException exception) {
            return badRequest(exception);
        }
    }

    private ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }
}
