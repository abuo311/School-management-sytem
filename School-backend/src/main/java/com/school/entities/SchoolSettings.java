package com.school.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "school_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchoolSettings {
    @Id
    private Long id = 1L;

    private String schoolName;
    private String motto;
    private String address;
    private String phone;
    private String email;
    private String academicYear;
    private String currentTerm;
    private String headMasterName;

    @Column(columnDefinition = "TEXT")
    private String reportSmsTemplate;

    @Lob
    @Column(name = "logo_url", columnDefinition = "LONGTEXT")
    private String logoUrl;

    @Lob
    @Column(name = "head_teacher_sign", columnDefinition = "LONGTEXT")
    private String headTeacherSign;

    @Lob
    @Column(name = "school_stamp", columnDefinition = "LONGTEXT")
    private String schoolStamp;

    // Fixed: Changed from @ElementCollection to @OneToMany with CascadeType.ALL
    // to give the collection table its own auto-increment primary key
    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER, orphanRemoval = true)
    @JoinColumn(name = "settings_id")
    private List<FormMasterData> formMasters = new ArrayList<>();
}

// Fixed: Promoted from @Embeddable to @Entity to satisfy the cloud MySQL
// primary key restriction
@Entity
@Table(name = "form_masters_list")
@Data
@NoArgsConstructor
@AllArgsConstructor
class FormMasterData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // This satisfies sql_require_primary_key

    private String name;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String signature;
}