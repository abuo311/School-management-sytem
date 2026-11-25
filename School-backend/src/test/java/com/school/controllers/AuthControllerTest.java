package com.school.controllers;

import com.school.dto.LoginRequest;
import com.school.repositories.UserRepository;
import com.school.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthControllerTest {

    @Test
    void returnsUnauthorizedForCredentialMismatch() {
        AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));
        AuthController controller = new AuthController(
                authenticationManager, mock(JwtService.class), mock(UserRepository.class));

        var response = controller.authenticateUser(new LoginRequest("unknown", "incorrect"));

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
}
