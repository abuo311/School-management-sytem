package com.school.controllers;

import com.school.dto.JwtResponse;
import com.school.dto.LoginRequest;
import com.school.entities.User; // Added import
import com.school.repositories.UserRepository; // Added import
import com.school.security.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime; // Added import

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository; // Added UserRepository

    // Updated constructor to include UserRepository
    public AuthController(AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> authenticateUser(@RequestBody LoginRequest loginRequest) {

        // 1. Authenticate the user
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        // 2. Set security context
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 3. Get User Details
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        // --- NEW: UPDATE LAST LOGIN TIMESTAMP ---
        userRepository.findByUsername(userDetails.getUsername()).ifPresent(user -> {
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        });
        // ----------------------------------------

        // 4. Generate the JWT Token
        String jwt = jwtService.generateToken(userDetails);

        // 5. Extract role without prefix (e.g., ROLE_ADMIN becomes ADMIN)
        String role = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(auth -> auth.startsWith("ROLE_"))
                .map(auth -> auth.substring(5))
                .findFirst()
                .orElse("USER");

        return ResponseEntity.ok(new JwtResponse(jwt, userDetails.getUsername(), role));
    }
}