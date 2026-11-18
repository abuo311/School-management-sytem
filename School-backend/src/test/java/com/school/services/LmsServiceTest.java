package com.school.services;

import com.school.dto.LmsCourseRequest;
import com.school.dto.LmsLessonRequest;
import com.school.dto.LmsStudentAccountRequest;
import com.school.entities.LmsCourse;
import com.school.entities.LmsLesson;
import com.school.entities.LmsLessonImage;
import com.school.entities.Role;
import com.school.entities.Student;
import com.school.entities.User;
import com.school.repositories.ClassRepository;
import com.school.repositories.LmsCourseRepository;
import com.school.repositories.LmsLessonImageRepository;
import com.school.repositories.LmsLessonRepository;
import com.school.repositories.LmsProgressRepository;
import com.school.repositories.StudentRepository;
import com.school.repositories.SubjectRepository;
import com.school.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LmsServiceTest {

    private LmsCourseRepository courseRepository;
    private LmsLessonRepository lessonRepository;
    private LmsLessonImageRepository lessonImageRepository;
    private LmsProgressRepository progressRepository;
    private StudentRepository studentRepository;
    private SubjectRepository subjectRepository;
    private ClassRepository classRepository;
    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private LmsService service;

    @BeforeEach
    void setUp() {
        courseRepository = mock(LmsCourseRepository.class);
        lessonRepository = mock(LmsLessonRepository.class);
        lessonImageRepository = mock(LmsLessonImageRepository.class);
        progressRepository = mock(LmsProgressRepository.class);
        studentRepository = mock(StudentRepository.class);
        subjectRepository = mock(SubjectRepository.class);
        classRepository = mock(ClassRepository.class);
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        service = new LmsService(courseRepository, lessonRepository, lessonImageRepository, progressRepository,
                studentRepository, subjectRepository, classRepository, userRepository, passwordEncoder);
    }

    @Test
    void studentOnlySeesPublishedCoursesForTheirClass() {
        Student student = student("Primary 3");
        User learner = user("learner", Role.STUDENT);
        learner.setStudent(student);
        LmsCourse matching = course(1L, "Primary 3", true, user("teacher", Role.TEACHER));
        LmsCourse unpublished = course(2L, "Primary 3", false, user("teacher", Role.TEACHER));
        LmsCourse differentClass = course(3L, "Primary 4", true, user("teacher", Role.TEACHER));
        when(userRepository.findByUsername("learner")).thenReturn(Optional.of(learner));
        when(courseRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(matching, unpublished, differentClass));
        when(lessonRepository.findByCourseIdOrderByPositionAscIdAsc(1L)).thenReturn(List.of());
        when(progressRepository.findByUserIdAndLessonCourseId(learner.getId(), 1L)).thenReturn(List.of());

        var result = service.listCourses("learner");

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).id());
    }

    @Test
    void studentCannotOpenCourseForAnotherClass() {
        Student student = student("Primary 3");
        User learner = user("learner", Role.STUDENT);
        learner.setStudent(student);
        LmsCourse course = course(4L, "Primary 4", true, user("teacher", Role.TEACHER));
        when(userRepository.findByUsername("learner")).thenReturn(Optional.of(learner));
        when(courseRepository.findById(4L)).thenReturn(Optional.of(course));

        assertThrows(IllegalArgumentException.class, () -> service.getCourse(4L, "learner"));
    }

    @Test
    void teacherCannotChangeAnotherTeachersCourse() {
        User teacher = user("teacher", Role.TEACHER);
        User courseOwner = user("owner", Role.TEACHER);
        LmsCourse course = course(5L, "Primary 3", false, courseOwner);
        when(userRepository.findByUsername("teacher")).thenReturn(Optional.of(teacher));
        when(courseRepository.findById(5L)).thenReturn(Optional.of(course));

        assertThrows(IllegalArgumentException.class,
                () -> service.updateCourse(5L, "teacher", new LmsCourseRequest("New title", "", "Primary 3", null, true)));
    }

    @Test
    void rejectsNonHttpVideoLinks() {
        User teacher = user("teacher", Role.TEACHER);
        LmsCourse course = course(6L, "Primary 3", false, teacher);
        when(userRepository.findByUsername("teacher")).thenReturn(Optional.of(teacher));
        when(courseRepository.findById(6L)).thenReturn(Optional.of(course));

        assertThrows(IllegalArgumentException.class,
                () -> service.addLesson(6L, "teacher",
                        new LmsLessonRequest("Unsafe video", "", "javascript:alert(1)", "", 1)));
        verify(lessonRepository, never()).save(any());
    }

    @Test
    void rejectsLessonImageWithMismatchedFileSignature() {
        User teacher = user("teacher", Role.TEACHER);
        LmsCourse course = course(7L, "Primary 3", false, teacher);
        LmsLesson lesson = new LmsLesson();
        lesson.setId(8L);
        lesson.setCourse(course);
        when(userRepository.findByUsername("teacher")).thenReturn(Optional.of(teacher));
        when(lessonRepository.findById(8L)).thenReturn(Optional.of(lesson));
        MockMultipartFile file = new MockMultipartFile("file", "diagram.png", "image/png",
                "not a png".getBytes());

        assertThrows(IllegalArgumentException.class, () -> service.uploadLessonImage(8L, "teacher", file));
        verify(lessonImageRepository, never()).save(any());
    }

    @Test
    void uploadsLessonImageAfterCheckingItsSignature() throws Exception {
        User teacher = user("teacher", Role.TEACHER);
        LmsCourse course = course(9L, "Primary 3", false, teacher);
        LmsLesson lesson = new LmsLesson();
        lesson.setId(10L);
        lesson.setCourse(course);
        when(userRepository.findByUsername("teacher")).thenReturn(Optional.of(teacher));
        when(lessonRepository.findById(10L)).thenReturn(Optional.of(lesson));
        when(lessonImageRepository.save(any())).thenAnswer(invocation -> {
            LmsLessonImage image = invocation.getArgument(0);
            image.setId(11L);
            return image;
        });
        byte[] pngSignature = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        MockMultipartFile file = new MockMultipartFile("file", "diagram.png", "image/png", pngSignature);

        var image = service.uploadLessonImage(10L, "teacher", file);

        assertEquals(11L, image.id());
        assertEquals("diagram.png", image.fileName());
        assertEquals("image/png", image.contentType());
        verify(lessonImageRepository).save(any(LmsLessonImage.class));
    }

    @Test
    void createsStudentAccountLinkedToTheSelectedStudent() {
        User administrator = user("admin", Role.ADMIN);
        Student student = student("Primary 3");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(administrator));
        when(studentRepository.findById(10L)).thenReturn(Optional.of(student));
        when(userRepository.existsByStudentId(10L)).thenReturn(false);
        when(userRepository.existsByUsername("pupil10")).thenReturn(false);
        when(passwordEncoder.encode("securepass")).thenReturn("hashed-password");

        service.createStudentAccount(10L, "admin", new LmsStudentAccountRequest("pupil10", "securepass"));

        var accountCaptor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(accountCaptor.capture());
        User account = accountCaptor.getValue();
        assertEquals(Role.STUDENT, account.getRole());
        assertEquals(student, account.getStudent());
        assertEquals("hashed-password", account.getPassword());
    }

    private Student student(String className) {
        Student student = new Student();
        student.setId(10L);
        student.setAdmissionNumber("ADM-10");
        student.setFirstName("Ada");
        student.setLastName("Learner");
        student.setClassName(className);
        student.setEnabled(true);
        return student;
    }

    private User user(String username, Role role) {
        User user = new User();
        user.setId((long) username.hashCode());
        user.setUsername(username);
        user.setRole(role);
        user.setEnabled(true);
        return user;
    }

    private LmsCourse course(Long id, String className, boolean published, User creator) {
        LmsCourse course = new LmsCourse();
        course.setId(id);
        course.setTitle("Course " + id);
        course.setClassName(className);
        course.setPublished(published);
        course.setCreatedBy(creator);
        return course;
    }
}
