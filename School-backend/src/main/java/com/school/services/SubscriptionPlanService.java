package com.school.services;

import com.school.dto.SubscriptionPlanDto;
import com.school.entities.SubscriptionPlanConfig;
import com.school.repositories.SubscriptionPlanConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SubscriptionPlanService {
    private final SubscriptionPlanConfigRepository repository;

    public SubscriptionPlanService(SubscriptionPlanConfigRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPlanDto> getPlans() {
        Map<String, SubscriptionPlanConfig> saved = new LinkedHashMap<>();
        repository.findAll().forEach(plan -> saved.put(plan.getCode(), plan));

        return SubscriptionPlan.allPlans().stream()
                .filter(dto -> {
                    SubscriptionPlanConfig plan = saved.get(dto.code());
                    return plan == null || plan.isEnabled();
                })
                .map(dto -> {
                    SubscriptionPlanConfig plan = saved.get(dto.code());
                    if (plan == null) {
                        return dto;
                    }
                    String duration = plan.getDurationMonths() == 12
                            ? "1 academic year"
                            : plan.getDurationMonths() + " months";
                    return new SubscriptionPlanDto(
                            dto.code(),
                            plan.getName(),
                            duration,
                            plan.getDurationMonths(),
                            plan.getAmount(),
                            dto.currency());
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public SubscriptionPlanDto getPlan(String code) {
        SubscriptionPlanDto defaultPlan = SubscriptionPlan.fromCode(code).toDto();
        SubscriptionPlanConfig saved = repository.findById(defaultPlan.code()).orElse(null);
        if (saved == null) {
            return defaultPlan;
        }
        if (!saved.isEnabled()) {
            throw new IllegalArgumentException("This subscription plan is disabled.");
        }
        String duration = saved.getDurationMonths() == 12
                ? "1 academic year"
                : saved.getDurationMonths() + " months";
        return new SubscriptionPlanDto(
                defaultPlan.code(),
                saved.getName(),
                duration,
                saved.getDurationMonths(),
                saved.getAmount(),
                defaultPlan.currency());
    }

    @Transactional
    public List<SubscriptionPlanDto> updatePlans(List<SubscriptionPlanDto> plans) {
        if (plans == null || plans.isEmpty()) {
            throw new IllegalArgumentException("At least one subscription plan is required.");
        }

        Map<String, SubscriptionPlanDto> submitted = new LinkedHashMap<>();
        for (SubscriptionPlanDto plan : plans) {
            SubscriptionPlan defaults;
            try {
                defaults = SubscriptionPlan.fromCode(plan.code());
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException("Unknown subscription plan code: " + plan.code());
            }
            if (plan.name() == null || plan.name().isBlank()) {
                throw new IllegalArgumentException("Plan name is required.");
            }
            if (plan.amount() == null || plan.amount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Plan amount must be greater than zero.");
            }
            if (plan.durationMonths() <= 0) {
                throw new IllegalArgumentException("Plan duration must be greater than zero.");
            }
            submitted.put(defaults.code(), plan);
        }

        for (SubscriptionPlanDto defaultPlan : SubscriptionPlan.allPlans()) {
            SubscriptionPlanDto plan = submitted.get(defaultPlan.code());
            if (plan == null) {
                continue;
            }
            SubscriptionPlanConfig config = repository.findById(defaultPlan.code()).orElseGet(() -> {
                SubscriptionPlanConfig created = new SubscriptionPlanConfig();
                created.setCode(defaultPlan.code());
                return created;
            });
            config.setName(plan.name().trim());
            config.setDurationMonths(plan.durationMonths());
            config.setAmount(plan.amount().setScale(2, java.math.RoundingMode.HALF_UP));
            config.setEnabled(true);
            repository.save(config);
        }

        return getPlans();
    }
}
