package com.school.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@ToString(exclude = "teacher") 
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    private String fullName;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String status = "ACTIVE";

    private LocalDateTime lastLogin;

    private boolean enabled = true;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore 
    private Teacher teacher;

    public String getRoleName() {
        // Return the actual role name, or default to "USER" if null
        return (this.role != null) ? this.role.name() : "USER";
    }
}