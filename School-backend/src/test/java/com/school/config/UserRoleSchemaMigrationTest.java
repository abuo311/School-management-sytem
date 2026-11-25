package com.school.config;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserRoleSchemaMigrationTest {

    @Test
    void replacesLegacyRoleEnumWithStringColumn() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForMap(UserRoleSchemaMigration.ROLE_COLUMN_QUERY))
                .thenReturn(Map.of("DATA_TYPE", "enum", "CHARACTER_MAXIMUM_LENGTH", 7));

        new UserRoleSchemaMigration(jdbcTemplate).run(null);

        verify(jdbcTemplate).execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(20) NULL DEFAULT NULL");
        verify(jdbcTemplate).update("UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN'");
    }

    @Test
    void leavesCompatibleStringColumnUnchanged() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForMap(UserRoleSchemaMigration.ROLE_COLUMN_QUERY))
                .thenReturn(Map.of("DATA_TYPE", "varchar", "CHARACTER_MAXIMUM_LENGTH", 20));

        new UserRoleSchemaMigration(jdbcTemplate).run(null);

        verify(jdbcTemplate, never()).execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(20) NULL DEFAULT NULL");
        verify(jdbcTemplate).update("UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN'");
    }
}
