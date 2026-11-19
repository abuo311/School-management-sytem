package com.school.services;

import com.school.dto.LmsExamAnswerRequest;
import com.school.dto.LmsExamQuestionRequest;
import com.school.dto.LmsExamRequest;
import com.school.dto.LmsExamSubmissionRequest;
import com.school.entities.LmsCourse;
import com.school.entities.LmsExam;
import com.school.entities.LmsExamAnswer;
import com.school.entities.LmsExamAttempt;
import com.school.entities.LmsExamOption;
import com.school.entities.LmsExamQuestion;
import com.school.entities.Role;
import com.school.entities.Student;
import com.school.entities.User;
import com.school.repositories.LmsCourseRepository;
import com.school.repositories.LmsExamAttemptRepository;
import com.school.repositories.LmsExamRepository;
import com.school.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LmsExamServiceTest {

    private LmsCourseRepository courseRepository;
    private LmsExamRepository examRepository;
    private LmsExamAttemptRepository attemptRepository;
    private UserRepository userRepository;
    private LmsExamService service;

    @BeforeEach
    void setUp() {
        courseRepository = mock(LmsCourseRepository.class);
        examRepository = mock(LmsExamRepository.class);
        attemptRepository = mock(LmsExamAttemptRepository.class);
        userRepository = mock(UserRepository.class);
        service = new LmsExamService(courseRepository, examRepository, attemptRepository, userRepository);
    }

    @Test
    void studentExamSessionDoesNotExposeCorrectOptionsAndSubmissionIsAutoMarked() {
        User learner = studentUser("learner", "Primary 3");
        LmsExam exam = exam(20L, true);
        LmsExamQuestion first = question(31L, exam, "Which is a mammal?", 2);
        LmsExamOption correct = option(41L, first, "Whale", true);
        LmsExamOption incorrect = option(42L, first, "Trout", false);
        first.setOptions(List.of(correct, incorrect));
        LmsExamQuestion second = question(32L, exam, "The Earth is flat.", 1);
        LmsExamOption trueOption = option(43L, second, "True", false);
        LmsExamOption falseOption = option(44L, second, "False", true);
        second.setOptions(List.of(trueOption, falseOption));
        exam.setQuestions(List.of(first, second));
        when(userRepository.findByUsername("learner")).thenReturn(Optional.of(learner));
        when(examRepository.findById(20L)).thenReturn(Optional.of(exam));
        when(attemptRepository.findFirstByExamIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(20L,
                learner.getId())).thenReturn(Optional.empty());
        when(attemptRepository.countByExamIdAndStudentId(20L, learner.getId())).thenReturn(0L);
        when(attemptRepository.save(any())).thenAnswer(invocation -> {
            LmsExamAttempt attempt = invocation.getArgument(0);
            attempt.setId(50L);
            return attempt;
        });

        var session = service.startAttempt(20L, "learner");

        assertEquals(2, session.questions().size());
        assertNull(session.questions().get(0).options().get(0).correct());
        assertNull(session.questions().get(0).options().get(1).correct());
        LmsExamAttempt attempt = attempt(50L, learner, exam);
        when(attemptRepository.findByIdAndExamId(50L, 20L)).thenReturn(Optional.of(attempt));

        var report = service.submitAttempt(20L, 50L, "learner",
                new LmsExamSubmissionRequest(List.of(
                        new LmsExamAnswerRequest(31L, 41L),
                        new LmsExamAnswerRequest(32L, 43L))));

        assertEquals(2, report.score());
        assertEquals(3, report.maxScore());
        assertEquals(67, report.percentage());
        assertTrue(report.answers().get(0).correct());
        assertFalse(report.answers().get(1).correct());
        assertEquals("False", report.answers().get(1).correctAnswer());
        verify(attemptRepository).save(attempt);
    }

    @Test
    void studentCannotStartAnExamForAnotherClass() {
        User learner = studentUser("learner", "Primary 3");
        LmsExam exam = exam(21L, true);
        exam.getCourse().setClassName("Primary 4");
        when(userRepository.findByUsername("learner")).thenReturn(Optional.of(learner));
        when(examRepository.findById(21L)).thenReturn(Optional.of(exam));

        assertThrows(IllegalArgumentException.class, () -> service.startAttempt(21L, "learner"));
        verify(attemptRepository, never()).save(any());
    }

    @Test
    void rejectsDuplicateOptionsAndInvalidExamSettings() {
        User teacher = user("teacher", Role.TEACHER);
        LmsCourse course = exam(22L, false).getCourse();
        when(userRepository.findByUsername("teacher")).thenReturn(Optional.of(teacher));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        LmsExamRequest request = new LmsExamRequest("Quiz", "", 0, null, false,
                List.of(new LmsExamQuestionRequest("MULTIPLE_CHOICE", "Pick one", 1,
                        List.of("Same", "Same"), 0)));

        assertThrows(IllegalArgumentException.class, () -> service.createExam(course.getId(), "teacher", request));
        verify(examRepository, never()).save(any());
    }

    @Test
    void preventsStartingMoreAttemptsThanTheExamAllows() {
        User learner = studentUser("learner", "Primary 3");
        LmsExam exam = exam(23L, true);
        exam.setMaxAttempts(1);
        when(userRepository.findByUsername("learner")).thenReturn(Optional.of(learner));
        when(examRepository.findById(23L)).thenReturn(Optional.of(exam));
        when(attemptRepository.findFirstByExamIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(
                23L, learner.getId())).thenReturn(Optional.empty());
        when(attemptRepository.countByExamIdAndStudentId(23L, learner.getId())).thenReturn(1L);

        assertThrows(IllegalArgumentException.class, () -> service.startAttempt(23L, "learner"));
        verify(attemptRepository, never()).save(any());
    }

    @Test
    void preventsChangingQuestionsAfterAnAttemptHasStarted() {
        User teacher = user("teacher", Role.TEACHER);
        LmsExam exam = exam(24L, false);
        when(userRepository.findByUsername("teacher")).thenReturn(Optional.of(teacher));
        when(examRepository.findById(24L)).thenReturn(Optional.of(exam));
        when(attemptRepository.existsByExamId(24L)).thenReturn(true);
        LmsExamRequest request = new LmsExamRequest("Revised", "", 1, null, false,
                List.of(new LmsExamQuestionRequest("TRUE_FALSE", "The Earth is round.", 1,
                        List.of("True", "False"), 0)));

        assertThrows(IllegalArgumentException.class, () -> service.updateExam(24L, "teacher", request));
        verify(examRepository, never()).save(any());
    }

    @Test
    void resumesAnAttemptWithItsSavedAnswers() {
        User learner = studentUser("learner", "Primary 3");
        LmsExam exam = exam(25L, true);
        LmsExamQuestion question = question(35L, exam, "Which is a mammal?", 1);
        LmsExamOption option = option(45L, question, "Whale", true);
        question.setOptions(List.of(option));
        exam.setQuestions(List.of(question));
        LmsExamAttempt attempt = attempt(55L, learner, exam);
        LmsExamAnswer savedAnswer = new LmsExamAnswer();
        savedAnswer.setAttempt(attempt);
        savedAnswer.setQuestion(question);
        savedAnswer.setSelectedOption(option);
        attempt.setAnswers(new java.util.ArrayList<>(List.of(savedAnswer)));
        when(userRepository.findByUsername("learner")).thenReturn(Optional.of(learner));
        when(examRepository.findById(25L)).thenReturn(Optional.of(exam));
        when(attemptRepository.findFirstByExamIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(
                25L, learner.getId())).thenReturn(Optional.of(attempt));

        var session = service.startAttempt(25L, "learner");

        assertEquals(1, session.savedAnswers().size());
        assertEquals(45L, session.savedAnswers().get(0).optionId());
    }

    @Test
    void rejectsAnswerOptionThatBelongsToAnotherQuestion() {
        User learner = studentUser("learner", "Primary 3");
        LmsExam exam = exam(26L, true);
        LmsExamQuestion first = question(36L, exam, "Question one", 1);
        LmsExamQuestion second = question(37L, exam, "Question two", 1);
        LmsExamOption option = option(46L, second, "Option", true);
        first.setOptions(List.of(option(47L, first, "First option", false)));
        second.setOptions(List.of(option));
        exam.setQuestions(List.of(first, second));
        LmsExamAttempt attempt = attempt(56L, learner, exam);
        when(userRepository.findByUsername("learner")).thenReturn(Optional.of(learner));
        when(examRepository.findById(26L)).thenReturn(Optional.of(exam));
        when(attemptRepository.findByIdAndExamId(56L, 26L)).thenReturn(Optional.of(attempt));

        assertThrows(IllegalArgumentException.class, () -> service.saveAttemptAnswers(26L, 56L, "learner",
                new LmsExamSubmissionRequest(List.of(new LmsExamAnswerRequest(36L, 46L)))));
        verify(attemptRepository, never()).save(any());
    }

    @Test
    void finalizesAnExpiredAttemptUsingSavedAnswers() {
        User learner = studentUser("learner", "Primary 3");
        LmsExam exam = exam(27L, true);
        exam.setTimeLimitMinutes(1);
        LmsExamQuestion question = question(38L, exam, "Which is a mammal?", 1);
        LmsExamOption correctOption = option(48L, question, "Whale", true);
        question.setOptions(List.of(correctOption));
        exam.setQuestions(List.of(question));
        LmsExamAttempt attempt = attempt(57L, learner, exam);
        attempt.setStartedAt(java.time.LocalDateTime.now().minusMinutes(2));
        LmsExamAnswer savedAnswer = new LmsExamAnswer();
        savedAnswer.setAttempt(attempt);
        savedAnswer.setQuestion(question);
        savedAnswer.setSelectedOption(correctOption);
        attempt.setAnswers(new java.util.ArrayList<>(List.of(savedAnswer)));
        when(userRepository.findByUsername("learner")).thenReturn(Optional.of(learner));
        when(courseRepository.findById(exam.getCourse().getId())).thenReturn(Optional.of(exam.getCourse()));
        when(examRepository.findByCourseIdOrderByIdAsc(exam.getCourse().getId())).thenReturn(List.of(exam));
        when(attemptRepository.findFirstByExamIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(
                exam.getId(), learner.getId())).thenReturn(Optional.of(attempt));
        when(attemptRepository.findByExamIdAndStudentIdOrderByStartedAtDesc(exam.getId(), learner.getId()))
                .thenReturn(List.of(attempt));

        var exams = service.listCourseExams(exam.getCourse().getId(), "learner");

        assertEquals(1, exams.get(0).bestScore());
        assertEquals(57L, exams.get(0).latestAttemptId());
        assertNull(exams.get(0).activeAttemptId());
        assertTrue(attempt.getSubmittedAt() != null);
        verify(attemptRepository).save(attempt);
    }

    private LmsExam exam(Long id, boolean published) {
        User teacher = user("teacher", Role.TEACHER);
        LmsCourse course = new LmsCourse();
        course.setId(id + 100);
        course.setTitle("Science");
        course.setClassName("Primary 3");
        course.setPublished(true);
        course.setCreatedBy(teacher);
        LmsExam exam = new LmsExam();
        exam.setId(id);
        exam.setCourse(course);
        exam.setTitle("Science quiz");
        exam.setPublished(published);
        exam.setMaxAttempts(2);
        exam.setQuestions(List.of());
        return exam;
    }

    private LmsExamQuestion question(Long id, LmsExam exam, String prompt, int points) {
        LmsExamQuestion question = new LmsExamQuestion();
        question.setId(id);
        question.setExam(exam);
        question.setType("MULTIPLE_CHOICE");
        question.setPrompt(prompt);
        question.setPoints(points);
        question.setPosition((int) (id % 10));
        return question;
    }

    private LmsExamOption option(Long id, LmsExamQuestion question, String text, boolean correct) {
        LmsExamOption option = new LmsExamOption();
        option.setId(id);
        option.setQuestion(question);
        option.setText(text);
        option.setCorrect(correct);
        return option;
    }

    private LmsExamAttempt attempt(Long id, User student, LmsExam exam) {
        LmsExamAttempt attempt = new LmsExamAttempt();
        attempt.setId(id);
        attempt.setStudent(student);
        attempt.setExam(exam);
        attempt.setStartedAt(java.time.LocalDateTime.now());
        return attempt;
    }

    private User studentUser(String username, String className) {
        User user = user(username, Role.STUDENT);
        Student student = new Student();
        student.setId(30L);
        student.setClassName(className);
        student.setEnabled(true);
        user.setStudent(student);
        return user;
    }

    private User user(String username, Role role) {
        User user = new User();
        user.setId((long) username.hashCode());
        user.setUsername(username);
        user.setRole(role);
        user.setEnabled(true);
        return user;
    }
}
