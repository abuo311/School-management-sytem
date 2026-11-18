package com.school.controllers;

import com.school.dto.LmsCourseDto;
import com.school.dto.LmsCourseRequest;
import com.school.dto.LmsLessonDto;
import com.school.dto.LmsLessonRequest;
import com.school.dto.LmsStudentAccountRequest;
import com.school.dto.LmsStudentDto;
import com.school.entities.LmsLessonImage;
import com.school.services.LmsService;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lms")
public class LmsController {

    private final LmsService lmsService;

    public LmsController(LmsService lmsService) {
        this.lmsService = lmsService;
    }

    @GetMapping("/courses")
    public List<LmsCourseDto> listCourses(Authentication authentication) {
        return lmsService.listCourses(authentication.getName());
    }

    @GetMapping("/courses/{courseId}")
    public ResponseEntity<?> getCourse(Authentication authentication, @PathVariable Long courseId) {
        return respond(() -> lmsService.getCourse(courseId, authentication.getName()));
    }

    @PostMapping("/courses")
    public ResponseEntity<?> createCourse(Authentication authentication, @RequestBody LmsCourseRequest request) {
        return respond(HttpStatus.CREATED, () -> lmsService.createCourse(authentication.getName(), request));
    }

    @PutMapping("/courses/{courseId}")
    public ResponseEntity<?> updateCourse(Authentication authentication, @PathVariable Long courseId,
            @RequestBody LmsCourseRequest request) {
        return respond(() -> lmsService.updateCourse(courseId, authentication.getName(), request));
    }

    @DeleteMapping("/courses/{courseId}")
    public ResponseEntity<?> deleteCourse(Authentication authentication, @PathVariable Long courseId) {
        return respondWithResponse(() -> {
            lmsService.deleteCourse(courseId, authentication.getName());
            return ResponseEntity.noContent().build();
        });
    }

    @PostMapping("/courses/{courseId}/lessons")
    public ResponseEntity<?> addLesson(Authentication authentication, @PathVariable Long courseId,
            @RequestBody LmsLessonRequest request) {
        return respond(HttpStatus.CREATED, () -> lmsService.addLesson(courseId, authentication.getName(), request));
    }

    @PutMapping("/lessons/{lessonId}")
    public ResponseEntity<?> updateLesson(Authentication authentication, @PathVariable Long lessonId,
            @RequestBody LmsLessonRequest request) {
        return respond(() -> lmsService.updateLesson(lessonId, authentication.getName(), request));
    }

    @DeleteMapping("/lessons/{lessonId}")
    public ResponseEntity<?> deleteLesson(Authentication authentication, @PathVariable Long lessonId) {
        return respondWithResponse(() -> {
            lmsService.deleteLesson(lessonId, authentication.getName());
            return ResponseEntity.noContent().build();
        });
    }

    @PostMapping(path = "/lessons/{lessonId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadLessonImage(Authentication authentication, @PathVariable Long lessonId,
            @RequestParam("file") MultipartFile file) throws IOException {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(lmsService.uploadLessonImage(lessonId, authentication.getName(), file));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    @GetMapping("/lessons/{lessonId}/images/{imageId}")
    public ResponseEntity<?> getLessonImage(Authentication authentication, @PathVariable Long lessonId,
            @PathVariable Long imageId) {
        try {
            LmsLessonImage image = lmsService.getLessonImage(lessonId, imageId, authentication.getName());
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(image.getContentType()))
                    .contentLength(image.getFileSize())
                    .cacheControl(CacheControl.noStore())
                    .header("X-Content-Type-Options", "nosniff")
                    .header("Content-Disposition", ContentDisposition.inline()
                            .filename(image.getFileName(), StandardCharsets.UTF_8).build().toString())
                    .body(image.getFileData());
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    @DeleteMapping("/lessons/{lessonId}/images/{imageId}")
    public ResponseEntity<?> deleteLessonImage(Authentication authentication, @PathVariable Long lessonId,
            @PathVariable Long imageId) {
        return respondWithResponse(() -> {
            lmsService.deleteLessonImage(lessonId, imageId, authentication.getName());
            return ResponseEntity.noContent().build();
        });
    }

    @PostMapping("/courses/{courseId}/lessons/{lessonId}/complete")
    public ResponseEntity<?> completeLesson(Authentication authentication, @PathVariable Long courseId,
            @PathVariable Long lessonId) {
        return respond(() -> lmsService.completeLesson(courseId, lessonId, authentication.getName()));
    }

    @GetMapping("/students/available")
    public List<LmsStudentDto> listStudentsWithoutAccounts(Authentication authentication) {
        return lmsService.listStudentsWithoutAccounts(authentication.getName());
    }

    @PostMapping("/students/{studentId}/account")
    public ResponseEntity<?> createStudentAccount(Authentication authentication, @PathVariable Long studentId,
            @RequestBody LmsStudentAccountRequest request) {
        return respond(HttpStatus.CREATED,
                () -> lmsService.createStudentAccount(studentId, authentication.getName(), request));
    }

    private ResponseEntity<?> respondWithResponse(SupplierWithResponse<?> action) {
        try {
            return action.get();
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    private <T> ResponseEntity<?> respond(SupplierWithValue<T> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    private <T> ResponseEntity<?> respond(HttpStatus status, SupplierWithValue<T> action) {
        try {
            return ResponseEntity.status(status).body(action.get());
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    @FunctionalInterface
    private interface SupplierWithValue<T> {
        T get();
    }

    @FunctionalInterface
    private interface SupplierWithResponse<T> {
        ResponseEntity<T> get();
    }
}
