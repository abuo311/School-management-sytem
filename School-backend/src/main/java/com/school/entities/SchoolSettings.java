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

    // Fixed: Using LONGTEXT to ensure Base64 strings aren't truncated
    @Lob
    @Column(name = "logo_url", columnDefinition = "LONGTEXT")
    private String logoUrl;

    @Lob
    @Column(name = "head_teacher_sign", columnDefinition = "LONGTEXT")
    private String headTeacherSign;

    @Lob
    @Column(name = "school_stamp", columnDefinition = "LONGTEXT")
    private String schoolStamp;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "form_masters_list", joinColumns = @JoinColumn(name = "settings_id"))
    private List<FormMasterData> formMasters = new ArrayList<>();
}

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
class FormMasterData {
    private String name;
    
    @Lob 
    @Column(columnDefinition = "LONGTEXT")
    private String signature;
}