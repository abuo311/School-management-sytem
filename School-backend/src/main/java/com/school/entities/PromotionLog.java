package com.school.entities;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "promotion_logs")
@Data
public class PromotionLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime promotionDate;
    private int studentCount;
    private String academicYear;
    private String performedBy; // Username of the admin
}