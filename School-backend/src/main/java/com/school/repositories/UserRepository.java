package com.school.repositories;

import com.school.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    /**
     * Fetches users who do not have an associated Teacher record.
     * This prevents one User account from being linked to multiple Teacher profiles.
     */
    @Query("SELECT u FROM User u WHERE u.id NOT IN (SELECT t.user.id FROM Teacher t WHERE t.user.id IS NOT NULL)")
    List<User> findUnassignedUsers();
}