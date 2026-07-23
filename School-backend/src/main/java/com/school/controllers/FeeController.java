package com.school.controllers;

import com.school.entities.FeePayment;
import com.school.services.FeeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = "/api/fees", produces = "application/json")
@CrossOrigin(origins = "https://school-management-sytem-seven.vercel.app/:5173")
public class FeeController {

    private final FeeService feeService;

    public FeeController(FeeService feeService) {
        this.feeService = feeService;
    }

    @PostMapping("/pay")
    public ResponseEntity<?> payFees(@RequestBody FeePayment payment) {
        try {
            // The service now handles duplicate checks and transactional logic
            return ResponseEntity.ok(feeService.savePayment(payment));
        } catch (RuntimeException e) {
            // Returns a 400 error with the specific message (e.g., "Duplicate payment
            // detected")
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            // Generic error handler for unexpected issues
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An unexpected error occurred processing the payment."));
        }
    }

    @GetMapping("/student/{id}")
    public ResponseEntity<List<FeePayment>> getStudentHistory(@PathVariable Long id) {
        return ResponseEntity.ok(feeService.getFeesByStudent(id));
    }

    @GetMapping("/latest-statuses")
    public ResponseEntity<List<FeePayment>> getLatestStatuses() {
        return ResponseEntity.ok(feeService.getAllLatestStatuses());
    }

    @GetMapping("/debtors")
    public ResponseEntity<List<FeePayment>> getDebtors() {
        return ResponseEntity.ok(feeService.getDebtors());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody FeePayment details) {
        try {
            return ResponseEntity.ok(feeService.updateFeeRecord(id, details));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            feeService.deleteFeeRecord(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getFinanceSummary(@RequestParam(required = false) String term) {
        try {
            return ResponseEntity.ok(feeService.getFinanceSummary(term));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}