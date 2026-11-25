package com.school.controllers;

import com.school.dto.TimetableTeacherDto;
import com.school.dto.TimetableCycleDto;
import com.school.services.TimetableService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

    @Test
    void returnsTeacherOptionsWithoutRequestingUserManagementData() {
        TimetableService service = mock(TimetableService.class);
        List<TimetableTeacherDto> teachers = List.of(new TimetableTeacherDto(5L, "teacher1", "Teacher One"));
        when(service.listAvailableTeachers()).thenReturn(teachers);
        TimetableController controller = new TimetableController(service);

        var result = controller.listAvailableTeachers();

        assertEquals(teachers, result);
        verify(service).listAvailableTeachers();
    }

    @Test
    void returnsCurrentCycleForTimetablePage() {
        TimetableService service = mock(TimetableService.class);
        TimetableCycleDto cycle = new TimetableCycleDto("Term 1", "2026/2027");
        when(service.currentCycle()).thenReturn(cycle);
        TimetableController controller = new TimetableController(service);

        assertEquals(cycle, controller.currentCycle());
        verify(service).currentCycle();
    }
}
