package com.school.dto;

import lombok.Data;
import java.util.List;

/**
 * DTO returned to the client upon successful authentication.
 */
@Data
public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private String username;
    private String role;

    public JwtResponse(String accessToken, String username, String role) {
        this.token = accessToken;
        this.username = username;
        this.role = role;
    }
}