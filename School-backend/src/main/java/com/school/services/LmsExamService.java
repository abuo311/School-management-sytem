package com.school.services;

import com.school.dto.LmsExamAnswerReportDto;
import com.school.dto.LmsExamAnswerRequest;
import com.school.dto.LmsExamDto;
import com.school.dto.LmsExamEditorDto;
import com.school.dto.LmsExamOptionDto;
import com.school.dto.LmsExamQuestionDto;
import com.school.dto.LmsExamQuestionRequest;
import com.school.dto.LmsExamReportDto;
import com.school.dto.LmsExamRequest;
import com.school.dto.LmsExamResultRowDto;
import com.school.dto.LmsExamSessionDto;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class LmsExamService {

    private static final Set<String> QUESTION_TYPES = Set.of("MULTIPLE_CHOICE", "TRUE_FALSE");

    private final LmsCourseRepository courseRepository;
    private final LmsExamRepository examRepository;
    private final LmsExamAttemptRepository attemptRepository;
    private final UserRepository userRepository;

    public LmsExamService(LmsCourseRepository courseRepository, LmsExamRepository examRepository,
            LmsExamAttemptRepository attemptRepository, UserRepository userRepository) {
        this.courseRepository = courseRepository;
        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public List<LmsExamDto> listCourseExams(Long courseId, String username) {
        User user = findUser(username);
        LmsCourse course = findCourse(courseId);
        requireCourseAccess(course, user);
        List<LmsExam> exams = examRepository.findByCourseIdOrderByIdAsc(courseId);
        if (user.getRole() == Role.STUDENT) {
            LocalDateTime now = LocalDateTime.now();
            exams.stream()
                    .filter(LmsExam::isPublished)
                    .map(exam -> attemptRepository
                            .findFirstByExamIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(
                                    exam.getId(), user.getId())
                            .orElse(null))
                    .filter(attempt -> attempt != null && isExpired(attempt, now))
                    .forEach(attempt -> finishAttempt(attempt, draftAnswers(attempt), now));
        }
        return exams.stream()
                .filter(exam -> user.getRole() != Role.STUDENT || exam.isPublished())
                .map(exam -> toExamDto(exam, user))
                .toList();
    }

    @Transactional(readOnly = true)
    public LmsExamEditorDto getExamForEditing(Long examId, String username) {
        User user = findUser(username);
        LmsExam exam = findExam(examId);
        requireCanManage(exam.getCourse(), user);
        return new LmsExamEditorDto(exam.getId(), exam.getTitle(), exam.getDescription(),
                exam.isPublished(), exam.getMaxAttempts(), exam.getTimeLimitMinutes(),
                exam.getQuestions().stream().map(question -> toQuestionDto(question, true)).toList());
    }

    @Transactional
    public LmsExamDto createExam(Long courseId, String username, LmsExamRequest request) {
        User user = findUser(username);
        LmsCourse course = findCourse(courseId);
        requireCanManage(course, user);
        validateExam(request);

        LmsExam exam = new LmsExam();
        exam.setCourse(course);
        exam.setCreatedAt(LocalDateTime.now());
        applyRequest(exam, request);
        return toExamDto(examRepository.save(exam), user);
    }

    @Transactional
    public LmsExamDto updateExam(Long examId, String username, LmsExamRequest request) {
        User user = findUser(username);
        LmsExam exam = findExam(examId);
        requireCanManage(exam.getCourse(), user);
        validateExam(request);
        if (attemptRepository.existsByExamId(examId)) {
            throw new IllegalArgumentException("An exam cannot be edited after a student has started an attempt.");
        }
        applyRequest(exam, request);
        return toExamDto(examRepository.save(exam), user);
    }

    @Transactional
    public void deleteExam(Long examId, String username) {
        User user = findUser(username);
        LmsExam exam = findExam(examId);
        requireCanManage(exam.getCourse(), user);
        examRepository.delete(exam);
    }

    @Transactional
    public LmsExamSessionDto startAttempt(Long examId, String username) {
        User user = findUser(username);
        Student student = requireActiveStudent(user);
        LmsExam exam = findExam(examId);
        requireStudentExamAccess(exam, student);
        LocalDateTime now = LocalDateTime.now();

        LmsExamAttempt activeAttempt = attemptRepository
                .findFirstByExamIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(examId, user.getId())
                .orElse(null);
        if (activeAttempt != null) {
            if (!isExpired(activeAttempt, now)) {
                return toSessionDto(activeAttempt);
            }
            finishAttempt(activeAttempt, draftAnswers(activeAttempt), now);
        }

        if (attemptRepository.countByExamIdAndStudentId(examId, user.getId()) >= exam.getMaxAttempts()) {
            throw new IllegalArgumentException("You have used all attempts available for this exam.");
        }
        LmsExamAttempt attempt = new LmsExamAttempt();
        attempt.setExam(exam);
        attempt.setStudent(user);
        attempt.setStartedAt(now);
        attempt.setMaxScore(totalPoints(exam));
        return toSessionDto(attemptRepository.save(attempt));
    }

    @Transactional
    public void saveAttemptAnswers(Long examId, Long attemptId, String username,
            LmsExamSubmissionRequest request) {
        User user = findUser(username);
        Student student = requireActiveStudent(user);
        LmsExam exam = findExam(examId);
        requireStudentExamAccess(exam, student);
        LmsExamAttempt attempt = requireOwnedAttempt(examId, attemptId, user);
        if (attempt.getSubmittedAt() != null) {
            throw new IllegalArgumentException("This exam attempt has already been submitted.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (isExpired(attempt, now)) {
            throw new IllegalArgumentException("The time limit has expired; submit your saved answers for marking.");
        }
        List<LmsExamAnswerRequest> submittedAnswers = request == null || request.answers() == null
                ? List.of()
                : request.answers();
        Map<Long, LmsExamOption> selectedOptions = validateAnswers(exam, submittedAnswers);
        attempt.getAnswers().clear();
        for (LmsExamQuestion question : exam.getQuestions()) {
            LmsExamOption selectedOption = selectedOptions.get(question.getId());
            if (selectedOption == null) {
                continue;
            }
            LmsExamAnswer answer = new LmsExamAnswer();
            answer.setAttempt(attempt);
            answer.setQuestion(question);
            answer.setSelectedOption(selectedOption);
            answer.setCorrect(false);
            answer.setPointsAwarded(0);
            attempt.getAnswers().add(answer);
        }
        attemptRepository.save(attempt);
    }

    @Transactional
    public LmsExamReportDto submitAttempt(Long examId, Long attemptId, String username,
            LmsExamSubmissionRequest request) {
        User user = findUser(username);
        Student student = requireActiveStudent(user);
        LmsExam exam = findExam(examId);
        requireStudentExamAccess(exam, student);
        LmsExamAttempt attempt = requireOwnedAttempt(examId, attemptId, user);
        if (attempt.getSubmittedAt() != null) {
            throw new IllegalArgumentException("This exam attempt has already been submitted.");
        }

        List<LmsExamAnswerRequest> submittedAnswers = request == null || request.answers() == null
                ? List.of()
                : request.answers();
        LocalDateTime submittedAt = LocalDateTime.now();
        if (isExpired(attempt, submittedAt)) {
            finishAttempt(attempt, draftAnswers(attempt), submittedAt);
        } else {
            finishAttempt(attempt, submittedAnswers, submittedAt);
        }
        return toReportDto(attempt);
    }

    @Transactional(readOnly = true)
    public LmsExamReportDto getReport(Long examId, Long attemptId, String username) {
        User user = findUser(username);
        LmsExamAttempt attempt = attemptRepository.findByIdAndExamId(attemptId, examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam attempt was not found."));
        if (user.getRole() == Role.STUDENT) {
            requireActiveStudent(user);
            if (!attempt.getStudent().getId().equals(user.getId())) {
                throw new IllegalArgumentException("This exam report does not belong to your account.");
            }
        } else {
            requireCanManage(attempt.getExam().getCourse(), user);
        }
        if (attempt.getSubmittedAt() == null) {
            throw new IllegalArgumentException("This exam attempt has not been submitted.");
        }
        return toReportDto(attempt);
    }

    @Transactional(readOnly = true)
    public List<LmsExamResultRowDto> listCourseResults(Long courseId, String username) {
        User user = findUser(username);
        requireCanManage(findCourse(courseId), user);
        return attemptRepository.findByExamCourseIdOrderBySubmittedAtDesc(courseId).stream()
                .filter(attempt -> attempt.getSubmittedAt() != null)
                .map(this::toResultRow)
                .toList();
    }

    @Transactional
    public void deleteCourseExams(Long courseId) {
        examRepository.findByCourseIdOrderByIdAsc(courseId).forEach(examRepository::delete);
    }

    private void validateExam(LmsExamRequest request) {
        if (request == null || request.title() == null || request.title().isBlank()
                || request.title().trim().length() > 120) {
            throw new IllegalArgumentException("Enter an exam title of up to 120 characters.");
        }
        if (request.description() != null && request.description().length() > 5000) {
            throw new IllegalArgumentException("Exam description must be 5,000 characters or fewer.");
        }
        if (request.maxAttempts() == null || request.maxAttempts() < 1 || request.maxAttempts() > 20) {
            throw new IllegalArgumentException("Set the number of attempts from 1 to 20.");
        }
        if (request.timeLimitMinutes() != null
                && (request.timeLimitMinutes() < 1 || request.timeLimitMinutes() > 300)) {
            throw new IllegalArgumentException("Set a time limit from 1 to 300 minutes, or leave it blank.");
        }
        if (request.questions() == null || request.questions().isEmpty() || request.questions().size() > 100) {
            throw new IllegalArgumentException("An exam must contain between 1 and 100 questions.");
        }
        for (int index = 0; index < request.questions().size(); index++) {
            validateQuestion(request.questions().get(index), index + 1);
        }
    }

    private void validateQuestion(LmsExamQuestionRequest question, int position) {
        if (question == null || question.type() == null) {
            throw new IllegalArgumentException("Question " + position + " is incomplete.");
        }
        String type = question.type().trim().toUpperCase(Locale.ROOT);
        if (!QUESTION_TYPES.contains(type)) {
            throw new IllegalArgumentException("Question " + position + " must be multiple choice or true/false.");
        }
        if (question.prompt() == null || question.prompt().isBlank() || question.prompt().length() > 2000) {
            throw new IllegalArgumentException("Enter a question of up to 2,000 characters for question " + position + ".");
        }
        if (question.points() == null || question.points() < 1 || question.points() > 100) {
            throw new IllegalArgumentException("Question " + position + " must be worth 1 to 100 points.");
        }
        if (question.options() == null || question.options().size() < 2 || question.options().size() > 6
                || question.options().stream().anyMatch(option -> option == null || option.isBlank()
                        || option.length() > 500)) {
            throw new IllegalArgumentException("Question " + position + " needs 2 to 6 options of up to 500 characters.");
        }
        if (question.options().stream().map(option -> option.trim().toLowerCase(Locale.ROOT)).distinct().count()
                != question.options().size()) {
            throw new IllegalArgumentException("Question " + position + " has duplicate options.");
        }
        if (question.correctOptionIndex() == null || question.correctOptionIndex() < 0
                || question.correctOptionIndex() >= question.options().size()) {
            throw new IllegalArgumentException("Choose the correct option for question " + position + ".");
        }
        if ("TRUE_FALSE".equals(type)
                && (question.options().size() != 2
                        || !question.options().get(0).trim().equalsIgnoreCase("True")
                        || !question.options().get(1).trim().equalsIgnoreCase("False"))) {
            throw new IllegalArgumentException("True/false questions must use True and False options in that order.");
        }
    }

    private void applyRequest(LmsExam exam, LmsExamRequest request) {
        exam.setTitle(request.title().trim());
        exam.setDescription(blankToNull(request.description()));
        exam.setMaxAttempts(request.maxAttempts());
        exam.setTimeLimitMinutes(request.timeLimitMinutes());
        exam.setPublished(Boolean.TRUE.equals(request.published()));
        exam.getQuestions().clear();
        for (int index = 0; index < request.questions().size(); index++) {
            LmsExamQuestionRequest questionRequest = request.questions().get(index);
            LmsExamQuestion question = new LmsExamQuestion();
            question.setExam(exam);
            question.setType(questionRequest.type().trim().toUpperCase(Locale.ROOT));
            question.setPrompt(questionRequest.prompt().trim());
            question.setPoints(questionRequest.points());
            question.setPosition(index + 1);
            for (int optionIndex = 0; optionIndex < questionRequest.options().size(); optionIndex++) {
                LmsExamOption option = new LmsExamOption();
                option.setQuestion(question);
                option.setText(questionRequest.options().get(optionIndex).trim());
                option.setPosition(optionIndex + 1);
                option.setCorrect(optionIndex == questionRequest.correctOptionIndex());
                question.getOptions().add(option);
            }
            exam.getQuestions().add(question);
        }
    }

    private void finishAttempt(LmsExamAttempt attempt, List<LmsExamAnswerRequest> submittedAnswers,
            LocalDateTime submittedAt) {
        Map<Long, LmsExamOption> selectedOptions = validateAnswers(attempt.getExam(), submittedAnswers);
        attempt.getAnswers().clear();
        int score = 0;
        int maxScore = 0;
        for (LmsExamQuestion question : attempt.getExam().getQuestions()) {
            maxScore += question.getPoints();
            LmsExamOption selectedOption = selectedOptions.get(question.getId());
            boolean correct = selectedOption != null && selectedOption.isCorrect();
            LmsExamAnswer answer = new LmsExamAnswer();
            answer.setAttempt(attempt);
            answer.setQuestion(question);
            answer.setSelectedOption(selectedOption);
            answer.setCorrect(correct);
            answer.setPointsAwarded(correct ? question.getPoints() : 0);
            attempt.getAnswers().add(answer);
            if (correct) {
                score += question.getPoints();
            }
        }
        attempt.setScore(score);
        attempt.setMaxScore(maxScore);
        attempt.setSubmittedAt(submittedAt);
        attemptRepository.save(attempt);
    }

    private Map<Long, LmsExamOption> validateAnswers(LmsExam exam, List<LmsExamAnswerRequest> submittedAnswers) {
        Map<Long, Long> selectedOptionsByQuestion = new HashMap<>();
        for (LmsExamAnswerRequest answer : submittedAnswers) {
            if (answer == null || answer.questionId() == null || answer.optionId() == null
                    || selectedOptionsByQuestion.putIfAbsent(answer.questionId(), answer.optionId()) != null) {
                throw new IllegalArgumentException("Each answer must select one option for a question.");
            }
        }
        Map<Long, LmsExamQuestion> questionsById = new HashMap<>();
        exam.getQuestions().forEach(question -> questionsById.put(question.getId(), question));
        if (!questionsById.keySet().containsAll(selectedOptionsByQuestion.keySet())) {
            throw new IllegalArgumentException("The submission contains a question that is not part of this exam.");
        }

        Map<Long, LmsExamOption> selectedOptions = new HashMap<>();
        for (LmsExamQuestion question : exam.getQuestions()) {
            Long selectedOptionId = selectedOptionsByQuestion.get(question.getId());
            LmsExamOption selectedOption = selectedOptionId == null ? null : question.getOptions().stream()
                    .filter(option -> option.getId().equals(selectedOptionId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("An answer option does not belong to its question."));
            if (selectedOption != null) {
                selectedOptions.put(question.getId(), selectedOption);
            }
        }
        return selectedOptions;
    }

    private LmsExamDto toExamDto(LmsExam exam, User viewer) {
        List<LmsExamAttempt> attempts = viewer.getRole() == Role.STUDENT
                ? attemptRepository.findByExamIdAndStudentIdOrderByStartedAtDesc(exam.getId(), viewer.getId())
                : attemptRepository.findByExamIdOrderBySubmittedAtDesc(exam.getId());
        Integer bestScore = attempts.stream()
                .filter(attempt -> attempt.getSubmittedAt() != null)
                .map(LmsExamAttempt::getScore)
                .max(Integer::compareTo)
                .orElse(null);
        Long activeAttemptId = attempts.stream()
                .filter(attempt -> attempt.getSubmittedAt() == null)
                .filter(attempt -> !isExpired(attempt, LocalDateTime.now()))
                .map(LmsExamAttempt::getId)
                .findFirst()
                .orElse(null);
        Long latestAttemptId = attempts.stream()
                .filter(attempt -> attempt.getSubmittedAt() != null)
                .map(LmsExamAttempt::getId)
                .findFirst()
                .orElse(null);
        return new LmsExamDto(exam.getId(), exam.getTitle(), exam.getDescription(), exam.isPublished(),
                exam.getMaxAttempts(), exam.getTimeLimitMinutes(), exam.getQuestions().size(),
                totalPoints(exam), attempts.size(), bestScore, activeAttemptId, latestAttemptId);
    }

    private LmsExamSessionDto toSessionDto(LmsExamAttempt attempt) {
        LmsExam exam = attempt.getExam();
        LocalDateTime expiresAt = exam.getTimeLimitMinutes() == null
                ? null
                : attempt.getStartedAt().plusMinutes(exam.getTimeLimitMinutes());
        List<LmsExamQuestionDto> questions = exam.getQuestions().stream()
                .map(question -> toQuestionDto(question, false))
                .toList();
        List<LmsExamAnswerRequest> savedAnswers = draftAnswers(attempt);
        return new LmsExamSessionDto(attempt.getId(), exam.getTitle(), exam.getDescription(),
                attempt.getStartedAt(), expiresAt, questions, savedAnswers);
    }

    private LmsExamQuestionDto toQuestionDto(LmsExamQuestion question, boolean includeCorrect) {
        List<LmsExamOptionDto> options = question.getOptions().stream()
                .map(option -> new LmsExamOptionDto(option.getId(), option.getText(), option.getPosition(),
                        includeCorrect ? option.isCorrect() : null))
                .toList();
        return new LmsExamQuestionDto(question.getId(), question.getType(), question.getPrompt(),
                question.getPoints(), question.getPosition(), options);
    }

    private LmsExamReportDto toReportDto(LmsExamAttempt attempt) {
        List<LmsExamAnswerReportDto> answers = attempt.getExam().getQuestions().stream()
                .map(question -> {
                    LmsExamAnswer answer = attempt.getAnswers().stream()
                            .filter(item -> item.getQuestion().getId().equals(question.getId()))
                            .findFirst()
                            .orElse(null);
                    String correctText = question.getOptions().stream()
                            .filter(LmsExamOption::isCorrect)
                            .map(LmsExamOption::getText)
                            .findFirst()
                            .orElse("");
                    return new LmsExamAnswerReportDto(question.getPrompt(),
                            answer == null || answer.getSelectedOption() == null
                                    ? null
                                    : answer.getSelectedOption().getText(),
                            correctText,
                            answer != null && answer.isCorrect(),
                            answer == null ? 0 : answer.getPointsAwarded(),
                            question.getPoints());
                })
                .toList();
        User student = attempt.getStudent();
        String studentName = student.getFullName() == null || student.getFullName().isBlank()
                ? student.getUsername()
                : student.getFullName();
        String className = student.getStudent() == null ? attempt.getExam().getCourse().getClassName()
                : student.getStudent().getClassName();
        int percentage = attempt.getMaxScore() == 0 ? 0
                : Math.round(attempt.getScore() * 100f / attempt.getMaxScore());
        return new LmsExamReportDto(attempt.getId(), attempt.getExam().getTitle(), studentName,
                className, attempt.getStartedAt(), attempt.getSubmittedAt(), attempt.getScore(),
                attempt.getMaxScore(), percentage, answers);
    }

    private LmsExamResultRowDto toResultRow(LmsExamAttempt attempt) {
        User student = attempt.getStudent();
        String studentName = student.getFullName() == null || student.getFullName().isBlank()
                ? student.getUsername()
                : student.getFullName();
        String admissionNumber = student.getStudent() == null ? "" : student.getStudent().getAdmissionNumber();
        int percentage = attempt.getMaxScore() == 0 ? 0
                : Math.round(attempt.getScore() * 100f / attempt.getMaxScore());
        return new LmsExamResultRowDto(attempt.getId(), attempt.getExam().getId(), attempt.getExam().getTitle(),
                studentName, admissionNumber, attempt.getStartedAt(), attempt.getSubmittedAt(),
                attempt.getScore(), attempt.getMaxScore(), percentage);
    }

    private void requireCourseAccess(LmsCourse course, User user) {
        if (user.getRole() == Role.STUDENT) {
            requireStudentCourseAccess(course, requireActiveStudent(user));
            return;
        }
        requireCanManage(course, user);
    }

    private void requireStudentExamAccess(LmsExam exam, Student student) {
        if (!exam.isPublished()) {
            throw new IllegalArgumentException("This exam is not available yet.");
        }
        requireStudentCourseAccess(exam.getCourse(), student);
    }

    private void requireStudentCourseAccess(LmsCourse course, Student student) {
        if (!course.isPublished() || !course.getClassName().equalsIgnoreCase(student.getClassName())) {
            throw new IllegalArgumentException("This course is not available to your account.");
        }
    }

    private void requireCanManage(LmsCourse course, User user) {
        if (user.getRole() != Role.SUPER_ADMIN
                && user.getRole() != Role.ADMIN
                && user.getRole() != Role.DIRECTOR
                && user.getRole() != Role.MANAGER
                && user.getRole() != Role.TEACHER) {
            throw new IllegalArgumentException("Only administrators and teachers can manage exams.");
        }
        if (user.getRole() == Role.TEACHER && !course.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only manage exams for courses that you created.");
        }
    }

    private Student requireActiveStudent(User user) {
        if (user.getRole() != Role.STUDENT || user.getStudent() == null || !user.getStudent().isEnabled()) {
            throw new IllegalArgumentException("An active student account is required.");
        }
        return user.getStudent();
    }

    private boolean isExpired(LmsExamAttempt attempt, LocalDateTime now) {
        Integer timeLimitMinutes = attempt.getExam().getTimeLimitMinutes();
        return timeLimitMinutes != null && !now.isBefore(attempt.getStartedAt().plusMinutes(timeLimitMinutes));
    }

    private List<LmsExamAnswerRequest> draftAnswers(LmsExamAttempt attempt) {
        return attempt.getAnswers().stream()
                .filter(answer -> answer.getSelectedOption() != null)
                .map(answer -> new LmsExamAnswerRequest(answer.getQuestion().getId(),
                        answer.getSelectedOption().getId()))
                .toList();
    }

    private LmsExamAttempt requireOwnedAttempt(Long examId, Long attemptId, User user) {
        LmsExamAttempt attempt = attemptRepository.findByIdAndExamId(attemptId, examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam attempt was not found."));
        if (!attempt.getStudent().getId().equals(user.getId())) {
            throw new IllegalArgumentException("This exam attempt does not belong to your account.");
        }
        return attempt;
    }

    private int totalPoints(LmsExam exam) {
        return exam.getQuestions().stream().mapToInt(LmsExamQuestion::getPoints).sum();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Account was not found."));
    }

    private LmsCourse findCourse(Long courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course was not found."));
    }

    private LmsExam findExam(Long examId) {
        return examRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam was not found."));
    }
}
