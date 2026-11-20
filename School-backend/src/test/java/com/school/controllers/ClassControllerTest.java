package com.school.controllers;

import com.school.entities.SchoolClass;
import com.school.repositories.ClassRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClassControllerTest {

    private ClassRepository classRepository;
    private ClassController classController;

    @BeforeEach
    void setUp() {
        classRepository = mock(ClassRepository.class);
        classController = new ClassController();
        ReflectionTestUtils.setField(classController, "classRepository", classRepository);
        when(classRepository.save(any(SchoolClass.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createsDistinctClassIdentityFromGradeAndSectionDescription() {
        SchoolClass goldClass = new SchoolClass();
        goldClass.setGradeName(" basic 1 ");
        goldClass.setDescription(" Gold ");
        SchoolClass diamondClass = new SchoolClass();
        diamondClass.setGradeName("Basic 1");
        diamondClass.setDescription("Diamond");
        when(classRepository.existsByClassName("BASIC 1 GOLD")).thenReturn(false);
        when(classRepository.existsByClassName("BASIC 1 DIAMOND")).thenReturn(false);

        ResponseEntity<?> goldResponse = classController.add(goldClass);
        ResponseEntity<?> diamondResponse = classController.add(diamondClass);

        SchoolClass savedGoldClass = (SchoolClass) goldResponse.getBody();
        SchoolClass savedDiamondClass = (SchoolClass) diamondResponse.getBody();
        assertEquals("BASIC 1 GOLD", savedGoldClass.getClassName());
        assertEquals("BASIC 1 DIAMOND", savedDiamondClass.getClassName());
        assertEquals("BASIC 1", savedGoldClass.getGradeName());
        assertEquals("Gold", savedGoldClass.getDescription());
    }

    @Test
    void preservesExistingFullClassNamesWhenNoGradeNameIsProvided() {
        SchoolClass schoolClass = new SchoolClass();
        schoolClass.setClassName("JHS 1A");
        when(classRepository.existsByClassName("JHS 1A")).thenReturn(false);

        ResponseEntity<?> response = classController.add(schoolClass);

        SchoolClass savedClass = (SchoolClass) response.getBody();
        assertEquals("JHS 1A", savedClass.getClassName());
        assertEquals("JHS 1A", savedClass.getGradeName());
    }
}
