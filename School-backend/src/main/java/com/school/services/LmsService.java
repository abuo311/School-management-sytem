package com.school.services;

import com.school.dto.LmsCourseDto;
import com.school.dto.LmsCourseRequest;
import com.school.dto.LmsLessonDto;
import com.school.dto.LmsLessonRequest;
import com.school.dto.LmsStudentAccountRequest;
import com.school.dto.LmsStudentDto;
import com.school.entities.LmsCourse;
import com.school.entities.LmsLesson;
import com.school.entities.LmsProgress;
import com.school.entities.Role;
import com.school.entities.SchoolClass;
import com.school.entities.Student;
import com.school.entities.Subject;
import com.school.entities.User;
import com.school.repositories.ClassRepository;
import com.school.repositories.LmsCourseRepository;
import com.school.repositories.LmsLessonRepository;
import com.school.repositories.LmsProgressRepository;
import com.school.repositories.StudentRepository;
import com.school.repositories.SubjectRepository;
import com.school.repositories.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LmsService {

    private final LmsCourseRepository courseRepository;
    private final LmsLessonRepository lessonRepository;
    private final LmsProgressRepository progressRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public LmsService(LmsCourseRepository courseRepository, LmsLessonRepository lessonRepository,
            LmsProgressRepository progressRepository, StudentRepository studentRepository,
            SubjectRepository subjectRepository, ClassRepository classRepository, UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.courseRepository = courseRepository;
        this.lessonRepository = lessonRepository;
        this.progressRepository = progressRepository;
        this.studentRepository = studentRepository;
        this.subjectRepository = subjectRepository;
        this.classRepository = classRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<LmsCourseDto> listCourses(String username) {
        User user = findUser(username);
        List<LmsCourse> courses;
        if (user.getRole() == Role.ADMIN) {
            courses = courseRepository.findAllByOrderByCreatedAtDesc();
        } else if (user.getRole() == Role.TEACHER) {
            courses = courseRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId());
        } else if (user.getRole() == Role.STUDENT) {
            Student student = requireActiveStudent(user);
            courses = courseRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(course -> course.isPublished()
                            && course.getClassName().equalsIgnoreCase(student.getClassName()))
                    .toList();
        } else {
            throw new IllegalArgumentException("Your account cannot access learning courses.");
        }
        return courses.stream().map(course -> toDto(course, user)).toList();
    }

    @Transactional(readOnly = true)
    public LmsCourseDto getCourse(Long courseId, String username) {
        User user = findUser(username);
        LmsCourse course = findCourse(courseId);
        requireCourseAccess(course, user);
        return toDto(course, user);
    }

    @Transactional
    public LmsCourseDto createCourse(String username, LmsCourseRequest request) {
        User user = findUser(username);
        requireStaff(user);
        validateCourse(request);

        LmsCourse course = new LmsCourse();
        course.setCreatedBy(user);
        course.setCreatedAt(LocalDateTime.now());
        applyCourse(course, request);
        return toDto(courseRepository.save(course), user);
    }

    @Transactional
    public LmsCourseDto updateCourse(Long courseId, String username, LmsCourseRequest request) {
        User user = findUser(username);
        LmsCourse course = findCourse(courseId);
        requireCanManage(course, user);
        validateCourse(request);
        applyCourse(course, request);
        return toDto(courseRepository.save(course), user);
    }

    @Transactional
    public void deleteCourse(Long courseId, String username) {
        User user = findUser(username);
        LmsCourse course = findCourse(courseId);
        requireCanManage(course, user);
        progressRepository.deleteByLessonCourseId(courseId);
        lessonRepository.deleteByCourseId(courseId);
        courseRepository.delete(course);
    }

    @Transactional
    public LmsLessonDto addLesson(Long courseId, String username, LmsLessonRequest request) {
        User user = findUser(username);
        LmsCourse course = findCourse(courseId);
        requireCanManage(course, user);
        validateLesson(request);
        LmsLesson lesson = new LmsLesson();
        lesson.setCourse(course);
        int nextPosition = lessonRepository.findByCourseIdOrderByPositionAscIdAsc(courseId).stream()
                .mapToInt(LmsLesson::getPosition)
                .max()
                .orElse(0) + 1;
        applyLesson(lesson, request, nextPosition);
        return toLessonDto(lessonRepository.save(lesson), false);
    }

    @Transactional
    public LmsLessonDto updateLesson(Long lessonId, String username, LmsLessonRequest request) {
        User user = findUser(username);
        LmsLesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson was not found."));
        requireCanManage(lesson.getCourse(), user);
        validateLesson(request);
        applyLesson(lesson, request, lesson.getPosition());
        return toLessonDto(lessonRepository.save(lesson), false);
    }

    @Transactional
    public void deleteLesson(Long lessonId, String username) {
        User user = findUser(username);
        LmsLesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson was not found."));
        requireCanManage(lesson.getCourse(), user);
        progressRepository.deleteByLessonId(lessonId);
        lessonRepository.delete(lesson);
    }

    @Transactional
    public LmsCourseDto completeLesson(Long courseId, Long lessonId, String username) {
        User user = findUser(username);
        Student student = requireActiveStudent(user);
        LmsCourse course = findCourse(courseId);
        if (!course.isPublished() || !course.getClassName().equalsIgnoreCase(student.getClassName())) {
            throw new IllegalArgumentException("This course is not available to your account.");
        }
        LmsLesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson was not found."));
        if (!lesson.getCourse().getId().equals(course.getId())) {
            throw new IllegalArgumentException("The lesson does not belong to this course.");
        }
        if (progressRepository.findByUserIdAndLessonId(user.getId(), lessonId).isEmpty()) {
            LmsProgress progress = new LmsProgress();
            progress.setUser(user);
            progress.setLesson(lesson);
            progress.setCompletedAt(LocalDateTime.now());
            progressRepository.save(progress);
        }
        return toDto(course, user);
    }

    @Transactional(readOnly = true)
    public List<LmsStudentDto> listStudentsWithoutAccounts(String username) {
        requireAdministrator(findUser(username));
        Set<Long> linkedStudentIds = userRepository.findStudentIdsWithAccounts();
        return studentRepository.findAllByEnabledTrue().stream()
                .filter(student -> !linkedStudentIds.contains(student.getId()))
                .map(this::toStudentDto)
                .toList();
    }

    @Transactional
    public LmsStudentDto createStudentAccount(Long studentId, String username, LmsStudentAccountRequest request) {
        requireAdministrator(findUser(username));
        if (request == null || request.username() == null || request.username().isBlank()
                || request.username().trim().length() > 100) {
            throw new IllegalArgumentException("Enter a username of up to 100 characters.");
        }
        if (request.password() == null || request.password().length() < 8) {
            throw new IllegalArgumentException("Student passwords must be at least 8 characters.");
        }
        Student student = studentRepository.findById(studentId)
                .filter(Student::isEnabled)
                .orElseThrow(() -> new IllegalArgumentException("An active student record was not found."));
        if (userRepository.existsByStudentId(studentId)) {
            throw new IllegalArgumentException("This student already has a learning account.");
        }
        String accountName = request.username().trim();
        if (userRepository.existsByUsername(accountName)) {
            throw new IllegalArgumentException("That username is already in use.");
        }

        User account = new User();
        account.setUsername(accountName);
        account.setFullName(student.getFirstName() + " " + student.getLastName());
        account.setPassword(passwordEncoder.encode(request.password()));
        account.setRole(Role.STUDENT);
        account.setStatus("ACTIVE");
        account.setEnabled(true);
        account.setStudent(student);
        userRepository.save(account);
        return toStudentDto(student);
    }

    private void validateCourse(LmsCourseRequest request) {
        if (request == null || request.title() == null || request.title().isBlank()
                || request.title().trim().length() > 120 || request.className() == null
                || request.className().isBlank()) {
            throw new IllegalArgumentException("Course title and class are required.");
        }
        if (request.description() != null && request.description().length() > 10000) {
            throw new IllegalArgumentException("Course description must be 10,000 characters or fewer.");
        }
    }

    private void validateLesson(LmsLessonRequest request) {
        if (request == null || request.title() == null || request.title().isBlank()
                || request.title().trim().length() > 120) {
            throw new IllegalArgumentException("Enter a lesson title of up to 120 characters.");
        }
        if (request.content() != null && request.content().length() > 50000) {
            throw new IllegalArgumentException("Lesson content must be 50,000 characters or fewer.");
        }
        validateOptionalUrl(request.videoUrl(), "Video");
        validateOptionalUrl(request.resourceUrl(), "Resource");
    }

    private void validateOptionalUrl(String value, String label) {
        if (value == null || value.isBlank()) {
            return;
        }
        try {
            URI uri = URI.create(value.trim());
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null || value.trim().length() > 500) {
                throw new IllegalArgumentException(label + " links must be valid HTTP or HTTPS URLs.");
            }
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(label + " links must be valid HTTP or HTTPS URLs.");
        }
    }

    private void applyCourse(LmsCourse course, LmsCourseRequest request) {
        course.setTitle(request.title().trim());
        course.setDescription(blankToNull(request.description()));
        SchoolClass schoolClass = classRepository.findByClassNameIgnoreCase(request.className().trim())
                .orElseThrow(() -> new IllegalArgumentException("Choose a class that exists in school settings."));
        course.setClassName(schoolClass.getClassName());
        Subject subject = request.subjectId() == null ? null : subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new IllegalArgumentException("The selected subject was not found."));
        course.setSubject(subject);
        course.setPublished(Boolean.TRUE.equals(request.published()));
    }

    private void applyLesson(LmsLesson lesson, LmsLessonRequest request, int defaultPosition) {
        lesson.setTitle(request.title().trim());
        lesson.setContent(blankToNull(request.content()));
        lesson.setVideoUrl(blankToNull(request.videoUrl()));
        lesson.setResourceUrl(blankToNull(request.resourceUrl()));
        lesson.setPosition(request.position() == null || request.position() < 1
                ? defaultPosition
                : request.position());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private LmsCourseDto toDto(LmsCourse course, User viewer) {
        boolean learner = viewer.getRole() == Role.STUDENT;
        Set<Long> completedLessonIds = learner
                ? progressRepository.findByUserIdAndLessonCourseId(viewer.getId(), course.getId()).stream()
                        .map(progress -> progress.getLesson().getId())
                        .collect(Collectors.toSet())
                : Set.of();
        List<LmsLessonDto> lessons = lessonRepository.findByCourseIdOrderByPositionAscIdAsc(course.getId()).stream()
                .map(lesson -> toLessonDto(lesson, completedLessonIds.contains(lesson.getId())))
                .toList();
        User creator = course.getCreatedBy();
        String teacherName = creator.getFullName() == null || creator.getFullName().isBlank()
                ? creator.getUsername()
                : creator.getFullName();
        return new LmsCourseDto(course.getId(), course.getTitle(), course.getDescription(), course.getClassName(),
                course.getSubject() == null ? null : course.getSubject().getId(),
                course.getSubject() == null ? null : course.getSubject().getName(), teacherName,
                course.isPublished(), course.getCreatedAt(), lessons,
                (int) lessons.stream().filter(LmsLessonDto::completed).count());
    }

    private LmsLessonDto toLessonDto(LmsLesson lesson, boolean completed) {
        return new LmsLessonDto(lesson.getId(), lesson.getTitle(), lesson.getContent(), lesson.getVideoUrl(),
                lesson.getResourceUrl(), lesson.getPosition(), completed);
    }

    private LmsStudentDto toStudentDto(Student student) {
        return new LmsStudentDto(student.getId(), student.getAdmissionNumber(),
                student.getFirstName() + " " + student.getLastName(), student.getClassName());
    }

    private void requireCourseAccess(LmsCourse course, User user) {
        if (user.getRole() == Role.STUDENT) {
            Student student = requireActiveStudent(user);
            if (!course.isPublished() || !course.getClassName().equalsIgnoreCase(student.getClassName())) {
                throw new IllegalArgumentException("This course is not available to your account.");
            }
            return;
        }
        requireCanManage(course, user);
    }

    private void requireCanManage(LmsCourse course, User user) {
        requireStaff(user);
        if (user.getRole() != Role.ADMIN && !course.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only manage courses that you created.");
        }
    }

    private void requireStaff(User user) {
        if (user.getRole() != Role.ADMIN && user.getRole() != Role.TEACHER) {
            throw new IllegalArgumentException("Only administrators and teachers can manage courses.");
        }
    }

    private void requireAdministrator(User user) {
        if (user.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only administrators can create student accounts.");
        }
    }

    private Student requireActiveStudent(User user) {
        if (user.getRole() != Role.STUDENT || user.getStudent() == null || !user.getStudent().isEnabled()) {
            throw new IllegalArgumentException("An active student account is required.");
        }
        return user.getStudent();
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Account was not found."));
    }

    private LmsCourse findCourse(Long courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course was not found."));
    }
}
