package com.school.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String admissionNumber;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String gender;
    private LocalDate dateOfBirth;
    private String gradeLevel;
    private String className;
    private String parentName;
    private String parentEmail;
    private String parentContact;

    @Column(name = "home_address")
    @JsonProperty("homeAddress")
    private String homeAddress;

    @Column(columnDefinition = "LONGTEXT")
    private String studentPhoto;

    @Column(nullable = false)
    private boolean enabled = true;

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonIgnoreProperties("student")
    private List<FeePayment> feeHistory;

    // --- Dynamic Status Helpers (Transient) ---

    @Transient
    @JsonProperty("lastBalance")
    public double getLastBalance() {
        if (feeHistory == null || feeHistory.isEmpty()) {
            return 0.0;
        }
        // Returns the balance from the most recent payment record
        return feeHistory.get(feeHistory.size() - 1).getBalance();
    }

    @Transient
    @JsonProperty("totalPaid")
    public int getTotalPaid() {
        if (feeHistory == null) {
            return 0;
        }
        // Returns the number of transactions to trigger the "Paid" status logic in React
        return feeHistory.size();
    }

    // --- Compatibility Aliases ---
    public String getGuardianName() { return this.parentName; }
    public String getGuardianEmail() { return this.parentEmail; }
    public String getGuardianPhone() { return this.parentContact; }
    public String getAddress() { return this.homeAddress; }
    public void setAddress(String address) { this.homeAddress = address; }
}