package com.school.repositories;

import com.school.entities.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findAllByOrderByExpenseDateDescIdDesc();

    @Query("SELECT SUM(expense.amount) FROM Expense expense")
    BigDecimal sumAllExpenses();
}
