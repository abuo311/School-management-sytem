package com.school;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import io.github.cdimascio.dotenv.Dotenv; // Import the Dotenv class

@SpringBootApplication
public class SchoolManagementSystemApplication { // <--- Add the 's' here!

    public static void main(String[] args) {
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        dotenv.entries().forEach(e -> System.setProperty(e.getKey(), e.getValue()));
        SpringApplication.run(SchoolManagementSystemApplication.class, args); // <--- And here!
    }
}