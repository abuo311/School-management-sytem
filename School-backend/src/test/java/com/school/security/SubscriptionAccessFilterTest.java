package com.school.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.school.services.SubscriptionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SubscriptionAccessFilterTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void blocksAuthenticatedSchoolApiRequestsWhenSubscriptionHasExpired() throws Exception {
        SubscriptionService subscriptionService = mock(SubscriptionService.class);
        when(subscriptionService.hasAccess()).thenReturn(false);
        SubscriptionAccessFilter filter = new SubscriptionAccessFilter(subscriptionService, new ObjectMapper());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/students");
        request.setServletPath("/api/students");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));

        filter.doFilter(request, response, chain);

        assertEquals(402, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"status\":\"EXPIRED\""));
        assertNull(chain.getRequest());
        verify(subscriptionService).hasAccess();
    }

    @Test
    void doesNotGateSubscriptionEndpoints() throws Exception {
        SubscriptionService subscriptionService = mock(SubscriptionService.class);
        SubscriptionAccessFilter filter = new SubscriptionAccessFilter(subscriptionService, new ObjectMapper());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/subscription/status");
        request.setServletPath("/api/subscription/status");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        verify(subscriptionService, never()).hasAccess();
        assertEquals(request, chain.getRequest());
    }
}
