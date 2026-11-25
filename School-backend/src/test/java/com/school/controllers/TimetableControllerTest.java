package com.school.controllers;

import com.school.services.TimetableService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TimetableControllerTest {

    @Test
    void treatsManagementRolesAsAdministratorsWhenListingTimetable() {
        TimetableService service = mock(TimetableService.class);
        when(service.list("director", true)).thenReturn(List.of());
        TimetableController controller = new TimetableController(service);
        var authentication = new UsernamePasswordAuthenticationToken("director", "",
                List.of(new SimpleGrantedAuthority("ROLE_DIRECTOR")));

        controller.list(authentication);

        verify(service).list("director", true);
    }
}
