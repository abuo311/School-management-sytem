package com.school.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.school.entities.Subscription;
import com.school.entities.SubscriptionPayment;
import com.school.entities.SubscriptionStatus;
import com.school.repositories.SubscriptionPaymentRepository;
import com.school.repositories.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SubscriptionServiceTest {
    private final RestClient.Builder restClientBuilder = mock(RestClient.Builder.class);
    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final SubscriptionPaymentRepository paymentRepository = mock(SubscriptionPaymentRepository.class);
    private SubscriptionService service;

    @BeforeEach
    void setUp() {
        when(restClientBuilder.baseUrl(anyString())).thenReturn(restClientBuilder);
        when(restClientBuilder.build()).thenReturn(mock(RestClient.class));
        service = new SubscriptionService(
                restClientBuilder,
                subscriptionRepository,
                paymentRepository,
                new ObjectMapper(),
                "test-secret",
                "https://school.test/subscription");
    }

    @Test
    void startsOneMonthTrialWhenSchoolHasNoSubscription() {
        when(subscriptionRepository.findById(Subscription.SINGLE_SCHOOL_ID)).thenReturn(Optional.empty());
        when(subscriptionRepository.saveAndFlush(any(Subscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(subscriptionRepository.save(any(Subscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var status = service.getStatus();

        assertEquals("TRIALING", status.status());
        assertTrue(status.trialUsed());
        assertNotNull(status.accessEndsAt());
        assertTrue(status.accessEndsAt().isAfter(LocalDateTime.now().plusDays(27)));
        assertTrue(status.accessEndsAt().isBefore(LocalDateTime.now().plusDays(32)));
        verify(subscriptionRepository).saveAndFlush(any(Subscription.class));
    }

    @Test
    void exposesTheConfirmedPricesAndDurations() {
        var plans = service.getPlans();

        assertEquals(4, plans.size());
        assertEquals(new BigDecimal("1000.00"), plans.get(0).amount());
        assertEquals(4, plans.get(0).durationMonths());
        assertEquals(new BigDecimal("2000.00"), plans.get(1).amount());
        assertEquals(new BigDecimal("2000.00"), plans.get(2).amount());
        assertEquals(12, plans.get(2).durationMonths());
        assertEquals(new BigDecimal("3500.00"), plans.get(3).amount());
        assertEquals(12, plans.get(3).durationMonths());
    }

    @Test
    void expiredTrialDoesNotGrantAccess() {
        Subscription subscription = new Subscription();
        subscription.setStatus(SubscriptionStatus.TRIALING);
        subscription.setTrialUsed(true);
        subscription.setTrialEndsAt(LocalDateTime.now().minusMinutes(1));
        when(subscriptionRepository.findById(Subscription.SINGLE_SCHOOL_ID))
                .thenReturn(Optional.of(subscription));
        when(subscriptionRepository.save(any(Subscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        assertFalse(service.hasAccess());
        assertEquals(SubscriptionStatus.EXPIRED, subscription.getStatus());
    }

    @Test
    void activatesPlanOnlyAfterProviderConfirmsTheExactPayment() {
        Subscription subscription = new Subscription();
        subscription.setId(Subscription.SINGLE_SCHOOL_ID);
        subscription.setStatus(SubscriptionStatus.TRIALING);
        subscription.setTrialUsed(true);
        subscription.setTrialEndsAt(LocalDateTime.now().plusDays(10));
        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setReference("SUB-test");
        payment.setPlanCode("STANDARD_FOUR_MONTHS");
        payment.setAmount(new BigDecimal("1000.00"));
        payment.setCurrency("GHS");
        payment.setStatus("PENDING");
        when(paymentRepository.findByReferenceForUpdate("SUB-test")).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(SubscriptionPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(subscriptionRepository.findByIdForUpdate(Subscription.SINGLE_SCHOOL_ID))
                .thenReturn(Optional.of(subscription));
        when(subscriptionRepository.save(any(Subscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        assertFalse(service.recordVerifiedPayment("SUB-test", "GHS", new BigDecimal("999.99")));
        assertEquals("FAILED", payment.getStatus());
        verify(subscriptionRepository, never()).save(any(Subscription.class));

        payment.setStatus("PENDING");
        assertTrue(service.recordVerifiedPayment("SUB-test", "GHS", new BigDecimal("1000.00")));
        assertEquals(SubscriptionStatus.ACTIVE, subscription.getStatus());
        assertEquals("STANDARD_FOUR_MONTHS", subscription.getPlanCode());
        assertTrue(subscription.getCurrentPeriodEndsAt().isAfter(LocalDateTime.now().plusMonths(3)));
        assertTrue(subscription.getCurrentPeriodEndsAt().isBefore(LocalDateTime.now().plusMonths(4).plusDays(1)));
        assertEquals("SUCCESS", payment.getStatus());
    }
}
