package com.school.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;

@Configuration
public class WebConfig implements WebMvcConfigurer {

        // 1. THIS FIXES THE 403 FORBIDDEN ERROR
        @Override
        public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**") // Apply to all API routes
                                .allowedOrigins("https://school-management-sytem-seven.vercel.app/:5173") // Allow your
                                                                                                          // React Dev
                                                                                                          // Server
                                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                                .allowedHeaders("*")
                                .allowCredentials(true);
        }

        // 2. KEEP YOUR EXISTING RESOURCE HANDLERS
        @Override
        public void addResourceHandlers(ResourceHandlerRegistry registry) {
                registry.addResourceHandler("/assets/**")
                                .addResourceLocations("classpath:/static/assets/");

                registry.addResourceHandler("/**")
                                .addResourceLocations("classpath:/static/");
        }

        @Override
        public void addViewControllers(ViewControllerRegistry registry) {
                // This catches everything that isn't a file (like .js, .css, .png)
                // and sends it to your React index.html
                registry.addViewController("/{path:[^\\.]*}")
                                .setViewName("forward:/index.html");

                // This specifically catches the dashboard sub-routes
                registry.addViewController("/dashboard/**")
                                .setViewName("forward:/index.html");
        }
}