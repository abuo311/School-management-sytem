package com.school.entities;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class SchoolClass {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String className; // e.g., "JHS 1A"

    private String formMasterName; // This will match a name in your Settings list
}