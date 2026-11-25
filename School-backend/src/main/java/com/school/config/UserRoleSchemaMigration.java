package com.school.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;

@Component
public class UserRoleSchemaMigration implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(UserRoleSchemaMigration.class);
    private static final int ROLE_COLUMN_LENGTH = 20;
    static final String ROLE_COLUMN_QUERY = """
            SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'role'
            """;

    private final JdbcTemplate jdbcTemplate;

    public UserRoleSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        Map<String, Object> roleColumn = jdbcTemplate.queryForMap(ROLE_COLUMN_QUERY);
        String dataType = String.valueOf(roleColumn.get("DATA_TYPE")).toLowerCase(Locale.ROOT);
        Object columnLengthValue = roleColumn.get("CHARACTER_MAXIMUM_LENGTH");
        int columnLength = columnLengthValue instanceof Number number ? number.intValue() : 0;

        if ("enum".equals(dataType) || ("varchar".equals(dataType) && columnLength < ROLE_COLUMN_LENGTH)) {
            jdbcTemplate.execute(
                    "ALTER TABLE users MODIFY COLUMN role VARCHAR(20) NULL DEFAULT NULL");
            logger.info("Migrated users.role to VARCHAR({})", ROLE_COLUMN_LENGTH);
        } else if (!"varchar".equals(dataType) || columnLength < ROLE_COLUMN_LENGTH) {
            throw new IllegalStateException("Unsupported users.role column definition: " + dataType);
        }

        jdbcTemplate.update("UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN'");
        logger.info("Migrated legacy ADMIN accounts to SUPER_ADMIN");
    }
}
