package com.school.controllers;

import com.school.services.LessonNoteService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LessonNoteControllerTest {

    @Test
    void treatsSuperAdministratorAsAdministratorWhenListingLessonNotes() {
        LessonNoteService service = mock(LessonNoteService.class);
        when(service.list("superuser", true, null)).thenReturn(List.of());
        LessonNoteController controller = new LessonNoteController(service);
        var authentication = new UsernamePasswordAuthenticationToken("superuser", "",
                List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));

        controller.list(authentication, null);

        verify(service).list("superuser", true, null);
    }
}
