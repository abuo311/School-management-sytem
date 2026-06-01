package com.school.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public WebSecurityConfig(UserDetailsServiceImpl userDetailsService,
            JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // CRITICAL: Explicitly allow browser OPTIONS requests to bypass auth checks
                        // entirely
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/settings").permitAll()

                        // --- ROLE-BASED ACCESS CONTROL ---

                        // Settings & Global Config: Only ADMIN
                        .requestMatchers("/api/settings/**").hasRole("ADMIN")

                        // Student Management: ADMIN, TEACHER, and BURSAR
                        .requestMatchers("/api/students/**").hasAnyRole("ADMIN", "TEACHER", "BURSAR")
                        .requestMatchers("/api/attendance/**").hasAnyRole("ADMIN", "TEACHER")

                        // Academic Management: ADMIN and TEACHER
                        .requestMatchers("/api/subjects/**").hasAnyRole("ADMIN", "TEACHER")
                        .requestMatchers("/api/classes/**").hasAnyRole("ADMIN", "TEACHER")

                        // Finance/Bursary Management: ADMIN and BURSAR
                        .requestMatchers("/api/fees/**").hasAnyRole("ADMIN", "BURSAR")
                        .requestMatchers("/api/payments/**").hasAnyRole("ADMIN", "BURSAR")
                        .requestMatchers("/api/expenses/**").hasAnyRole("ADMIN", "BURSAR")

                        // Teacher/Staff Management: Only ADMIN
                        .requestMatchers("/api/teachers/**").hasRole("ADMIN")

                        // --- PROTECT ALL OTHER ROUTES ---
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Using allowed origin patterns to dynamically support all Vercel preview
        // deployment URLs
        configuration.setAllowedOriginPatterns(Arrays.asList(
                "https://school-management-sytem-seven.vercel.app", // Your primary production domain
                "https://school-management-sytem-*.vercel.app", // Wildcard to match ALL your Vercel deployment
                                                                // variations!
                "http://localhost:5173", // Local Vite environment
                "http://localhost:3000" // Local CRA environment
        ));

        // Allowed request types
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Comprehensive headers matching typical browser request signatures
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Cache-Control",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Pragma",
                "Expires"));

        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}