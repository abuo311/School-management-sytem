package com.school.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {
    // Add /dashboard here so refreshing the page redirects to index.html
    @GetMapping({"/", "/login", "/dashboard", "/students/**", "/teachers/**"})
    public String index() {
        return "forward:/index.html";
    }
}