package com.school.config;

import com.school.entities.User;
import com.school.entities.Role;
import com.school.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        System.out.println("--- System Initialization ---");

        // 1. Create Admin
        createUserIfNotFound("admin", "admin123", "System Admin", Role.ADMIN);

        // 2. Create Teacher
        createUserIfNotFound("teacher", "teacher123", "Default Teacher", Role.TEACHER);

        // 3. Create Bursar
        createUserIfNotFound("bursar", "bursar123", "Default Bursar", Role.BURSAR);

        System.out.println("-----------------------------");
    }

    /**
     * Helper method to create users only if they don't already exist.
     */
    private void createUserIfNotFound(String username, String password, String fullName, Role role) {
        if (userRepository.findByUsername(username).isEmpty()) {
            User user = new User();
            user.setFullName(fullName);
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            user.setEnabled(true);
            
            userRepository.save(user);

            System.out.println("SUCCESS: Default " + role.name() + " account created.");
            System.out.println("  Username: " + username);
            System.out.println("  Password: " + password);
        } else {
            System.out.println("INFO: " + role.name() + " account (" + username + ") already exists.");
        }
    }
}