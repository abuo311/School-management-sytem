package com.school.controllers;

import com.school.entities.FeePayment;
import com.school.dto.FeeBalanceDto;
import com.school.dto.IssueFeesResponse;
import com.school.services.FeeAssessmentService;
import com.school.services.FeeService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(value = "/api/fees", produces = "application/json")
@CrossOrigin(origins = {
        "https://school-management-sytem-seven.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
})
public class FeeController {

    private final FeeService feeService;
    private final FeeAssessmentService feeAssessmentService;

    public FeeController(FeeService feeService, FeeAssessmentService feeAssessmentService) {
        this.feeService = feeService;
        this.feeAssessmentService = feeAssessmentService;
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
    public ResponseEntity<List<FeeBalanceDto>> getDebtors(
            @RequestParam(required = false) String term,
            @RequestParam(required = false) String academicYear) {
        return ResponseEntity.ok(feeAssessmentService.getBalances(term, academicYear, true));
    }

    @GetMapping("/balances")
    public ResponseEntity<List<FeeBalanceDto>> getBalances(
            @RequestParam(required = false) String term,
            @RequestParam(required = false) String academicYear) {
        return ResponseEntity.ok(feeAssessmentService.getBalances(term, academicYear, false));
    }

    @PostMapping("/assessments/issue")
    public ResponseEntity<?> issueCurrentTermFees() {
        try {
            IssueFeesResponse response = feeAssessmentService.issueCurrentTermFees();
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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
        return deletePayment(id);
    }

    // POST fallback for hosting/proxy environments that block DELETE requests.
    @PostMapping("/delete/{id}")
    public ResponseEntity<?> deleteByPost(@PathVariable Long id) {
        return deletePayment(id);
    }

    private ResponseEntity<?> deletePayment(Long id) {
        try {
            feeService.deleteFeeRecord(id);
            return ResponseEntity.ok(Map.of("message", "Payment record deleted successfully."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Payment record cannot be deleted because it is still referenced."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Unable to delete payment record."));
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