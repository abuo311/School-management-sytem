package com.school.controllers;

import com.school.entities.PromotionLog;
import com.school.services.PromotionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/promotion")
// REMOVED @CrossOrigin("*") to prevent the allowCredentials crash
public class PromotionController {

    private final PromotionService promotionService;

    // Use Constructor Injection for better stability
    public PromotionController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    @PostMapping("/process")
    public ResponseEntity<String> processPromotion() {
        String result = promotionService.promoteAllStudents();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/history")
    public ResponseEntity<List<PromotionLog>> getHistory() {
        // This satisfies the call seen in Screenshot (184)
        return ResponseEntity.ok(promotionService.getHistory());
    }
}