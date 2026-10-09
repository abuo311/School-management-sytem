package com.school.dto;

import lombok.Data;

/**
 * DTO returned to the client upon successful authentication.
 */
@Data
public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private String username;
    private String role;
    private String fullName;
    private String profilePhoto;

    public JwtResponse(String accessToken, String username, String role, String fullName, String profilePhoto) {
        this.token = accessToken;
        this.username = username;
        this.role = role;
        this.fullName = fullName;
        this.profilePhoto = profilePhoto;
    }
}