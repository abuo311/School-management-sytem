package com.school.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "school_subscription")
@Data
@NoArgsConstructor
public class Subscription {
    public static final long SINGLE_SCHOOL_ID = 1L;

    @Id
    private Long id = SINGLE_SCHOOL_ID;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status;

    @Column(nullable = false)
    private boolean trialUsed;

    private LocalDateTime trialStartedAt;
    private LocalDateTime trialEndsAt;
    private String planCode;
    private LocalDateTime currentPeriodStartsAt;
    private LocalDateTime currentPeriodEndsAt;
}
