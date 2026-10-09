package com.school.repositories;

import com.school.entities.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    // You can add custom search methods here later if needed
    List<Teacher> findByUser_IdIn(List<Long> userIds);
}