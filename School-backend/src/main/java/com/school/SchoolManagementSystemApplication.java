package com.school;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import io.github.cdimascio.dotenv.Dotenv; // Import the Dotenv class

@SpringBootApplication
public class SchoolManagementSystemApplication { // <--- Add the 's' here!

    public static void main(String[] args) {

        Dotenv dotenv = Dotenv.configure().load(); // Load environment variables from .env file
        System.setProperty("url", dotenv.get("url")); // Set the 'url'
        System.setProperty("username", dotenv.get("username")); // Set the 'username'
        System.setProperty("password", dotenv.get("password")); // Set the 'password'
        SpringApplication.run(SchoolManagementSystemApplication.class, args); // <--- And here!
    }
}