package com.school.services;

import com.school.dto.CanteenBalanceDto;
import com.school.dto.CanteenPaymentDto;
import com.school.dto.CanteenPaymentRequest;
import com.school.dto.FeeBalanceStudentDto;
import com.school.entities.CanteenPayment;
import com.school.entities.SchoolSettings;
import com.school.entities.Student;
import com.school.repositories.CanteenPaymentRepository;
import com.school.repositories.SettingsRepository;
import com.school.repositories.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CanteenService {

    private final CanteenPaymentRepository paymentRepository;
    private final SettingsRepository settingsRepository;
    private final StudentRepository studentRepository;

    public CanteenService(CanteenPaymentRepository paymentRepository,
            SettingsRepository settingsRepository,
            StudentRepository studentRepository) {
        this.paymentRepository = paymentRepository;
        this.settingsRepository = settingsRepository;
        this.studentRepository = studentRepository;
    }

    @Transactional(readOnly = true)
    public List<CanteenBalanceDto> getBalances() {
        SchoolSettings settings = currentSettings();
        LocalDate date = LocalDate.now();
        BillingCycle cycle = currentCycle(settings, date);
        BigDecimal assessedAmount = configuredAmount(settings);
        Map<Long, BigDecimal> paidByStudent = paymentRepository.findByBillingPeriod(cycle.period()).stream()
                .filter(payment -> payment.getStudent() != null)
                .collect(Collectors.groupingBy(payment -> payment.getStudent().getId(),
                        Collectors.mapping(CanteenPayment::getAmountPaid,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));

        return studentRepository.findAllByEnabledTrue().stream()
                .map(student -> {
                    BigDecimal paid = paidByStudent.getOrDefault(student.getId(), BigDecimal.ZERO);
                    return new CanteenBalanceDto(
                            new FeeBalanceStudentDto(student.getId(), student.getFirstName(), student.getLastName(),
                                    student.getAdmissionNumber(), student.getGradeLevel(), student.getParentContact(),
                                    student.getParentEmail()),
                            cycle.frequency(), cycle.period(), assessedAmount, paid,
                            assessedAmount.subtract(paid).max(BigDecimal.ZERO));
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CanteenPaymentDto> getStudentPayments(Long studentId) {
        return paymentRepository.findByStudentIdOrderByDatePaidDescIdDesc(studentId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public CanteenPaymentDto recordPayment(CanteenPaymentRequest request, String receivedBy) {
        if (request.studentId() == null) {
            throw new IllegalArgumentException("Select a student before recording a canteen payment.");
        }
        if (request.amountPaid() == null || request.amountPaid().signum() <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero.");
        }

        Student student = studentRepository.findById(request.studentId())
                .filter(Student::isEnabled)
                .orElseThrow(() -> new IllegalArgumentException("The selected active student was not found."));
        SchoolSettings settings = currentSettings();
        BigDecimal assessedAmount = configuredAmount(settings);
        if (assessedAmount.signum() <= 0) {
            throw new IllegalArgumentException("Set a positive canteen fee amount in Settings before recording payments.");
        }

        LocalDate paymentDate = LocalDate.now();
        BillingCycle cycle = currentCycle(settings, paymentDate);
        BigDecimal totalPaid = paymentRepository.findByBillingPeriod(cycle.period()).stream()
                .filter(payment -> payment.getStudent() != null
                        && student.getId().equals(payment.getStudent().getId()))
                .map(CanteenPayment::getAmountPaid)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal amount = request.amountPaid().setScale(2, RoundingMode.HALF_UP);
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException("Payment amount must be at least GHS 0.01.");
        }
        BigDecimal balance = assessedAmount.subtract(totalPaid).max(BigDecimal.ZERO);
        if (amount.compareTo(balance) > 0) {
            throw new IllegalArgumentException("Payment exceeds the outstanding canteen balance.");
        }

        CanteenPayment payment = new CanteenPayment();
        payment.setStudent(student);
        payment.setAmountPaid(amount);
        payment.setBillingFrequency(cycle.frequency());
        payment.setBillingPeriod(cycle.period());
        payment.setPaymentMethod(request.paymentMethod() == null || request.paymentMethod().isBlank()
                ? "Cash"
                : request.paymentMethod().trim());
        payment.setReceivedBy(receivedBy);
        payment.setDatePaid(paymentDate);
        return toDto(paymentRepository.save(payment));
    }

    private CanteenPaymentDto toDto(CanteenPayment payment) {
        return new CanteenPaymentDto(payment.getId(), payment.getAmountPaid(), payment.getBillingFrequency(),
                payment.getBillingPeriod(), payment.getPaymentMethod(), payment.getReceivedBy(),
                payment.getDatePaid());
    }

    private SchoolSettings currentSettings() {
        return settingsRepository.findFirstByOrderByIdAsc().orElseGet(SchoolSettings::new);
    }

    private BigDecimal configuredAmount(SchoolSettings settings) {
        double amount = settings.getCanteenFeeAmount() == null ? 0d : settings.getCanteenFeeAmount();
        if (!Double.isFinite(amount) || amount < 0) {
            throw new IllegalStateException("The configured canteen fee amount is invalid.");
        }
        return BigDecimal.valueOf(amount).setScale(2, RoundingMode.HALF_UP);
    }

    private BillingCycle currentCycle(SchoolSettings settings, LocalDate date) {
        String frequency = settings.getCanteenFeeFrequency() == null
                ? "TERMLY"
                : settings.getCanteenFeeFrequency().trim().toUpperCase(Locale.ROOT);
        String period = switch (frequency) {
            case "DAILY" -> "DAILY:" + date;
            case "WEEKLY" -> {
                LocalDate start = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                LocalDate end = start.plusDays(6);
                yield "WEEKLY:" + start + ":" + end;
            }
            case "MONTHLY" -> "MONTHLY:" + YearMonth.from(date);
            case "TERMLY" -> {
                String term = requireValue(settings.getCurrentTerm(), "Current term is not configured in Settings.");
                String academicYear = requireValue(settings.getAcademicYear(),
                        "Academic year is not configured in Settings.");
                yield "TERMLY:" + term.trim() + ":" + academicYear.trim();
            }
            default -> throw new IllegalStateException("Unsupported canteen billing frequency: " + frequency);
        };
        return new BillingCycle(frequency, period);
    }

    private String requireValue(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(message);
        }
        return value;
    }

    private record BillingCycle(String frequency, String period) {
    }
}
