package com.school.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "fee_payments")
public class FeePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String academicYear;
    private double amountPaid;
    private double balance;
    private LocalDate datePaid;
    private String paymentMethod;
    private String receivedBy;
    private String term;
    private double totalBill;

   // Replace the student field with this:
@ManyToOne(fetch = FetchType.EAGER)
@JoinColumn(name = "student_id")
@JsonIgnoreProperties("feeHistory") // Prevents the student from trying to load fees back again
private Student student;
}