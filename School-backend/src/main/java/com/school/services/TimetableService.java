package com.school.services;

import com.school.dto.TimetableEntryDto;
import com.school.dto.TimetableEntryRequest;
import com.school.entities.Role;
import com.school.entities.SchoolClass;
import com.school.entities.SchoolSettings;
import com.school.entities.Subject;
import com.school.entities.TimetableEntry;
import com.school.entities.User;
import com.school.repositories.ClassRepository;
import com.school.repositories.LessonNoteRepository;
import com.school.repositories.SettingsRepository;
import com.school.repositories.SubjectRepository;
import com.school.repositories.TimetableEntryRepository;
import com.school.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.List;

@Service
public class TimetableService {

    private final TimetableEntryRepository timetableRepository;
    private final ClassRepository classRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final SettingsRepository settingsRepository;
    private final LessonNoteRepository lessonNoteRepository;

    public TimetableService(TimetableEntryRepository timetableRepository, ClassRepository classRepository,
            SubjectRepository subjectRepository, UserRepository userRepository,
            SettingsRepository settingsRepository, LessonNoteRepository lessonNoteRepository) {
        this.timetableRepository = timetableRepository;
        this.classRepository = classRepository;
        this.subjectRepository = subjectRepository;
        this.userRepository = userRepository;
        this.settingsRepository = settingsRepository;
        this.lessonNoteRepository = lessonNoteRepository;
    }

    @Transactional(readOnly = true)
    public List<TimetableEntryDto> list(String username, boolean administrator) {
        SchoolSettings settings = currentSettings();
        String term = requireText(settings.getCurrentTerm(), "Set the current term in Settings first.");
        String year = requireText(settings.getAcademicYear(), "Set the academic year in Settings first.");
        List<TimetableEntry> entries;
        if (administrator) {
            entries = timetableRepository.findByTermIgnoreCaseAndAcademicYearIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
                    term, year);
        } else {
            User teacher = currentTeacher(username);
            entries = timetableRepository
                    .findByTeacherIdAndTermIgnoreCaseAndAcademicYearIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
                            teacher.getId(), term, year);
        }
        return entries.stream().map(this::toDto).toList();
    }

    @Transactional
    public TimetableEntryDto create(TimetableEntryRequest request) {
        SchoolSettings settings = currentSettings();
        String term = requireText(settings.getCurrentTerm(), "Set the current term in Settings first.");
        String year = requireText(settings.getAcademicYear(), "Set the academic year in Settings first.");
        return save(new TimetableEntry(), request, term, year);
    }

    @Transactional
    public TimetableEntryDto update(Long id, TimetableEntryRequest request) {
        TimetableEntry entry = timetableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timetable entry was not found."));
        return save(entry, request, entry.getTerm(), entry.getAcademicYear());
    }

    @Transactional
    public void delete(Long id) {
        TimetableEntry entry = timetableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timetable entry was not found."));
        if (lessonNoteRepository.existsByTimetableEntryId(id)) {
            throw new IllegalArgumentException("This timetable slot has lesson notes. Delete or move the notes first.");
        }
        timetableRepository.delete(entry);
    }

    private TimetableEntryDto save(TimetableEntry entry, TimetableEntryRequest request, String term, String year) {
        if (request == null || request.classId() == null || request.subjectId() == null || request.teacherId() == null
                || request.startTime() == null || request.endTime() == null) {
            throw new IllegalArgumentException("Class, subject, teacher, start time and end time are required.");
        }
        String day = request.dayOfWeek() == null ? "" : request.dayOfWeek().trim().toUpperCase();
        try {
            DayOfWeek.valueOf(day);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Select a valid day of the week.");
        }
        if (!request.startTime().isBefore(request.endTime())) {
            throw new IllegalArgumentException("End time must be later than start time.");
        }

        SchoolClass schoolClass = classRepository.findById(request.classId())
                .orElseThrow(() -> new IllegalArgumentException("Class was not found."));
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject was not found."));
        User teacher = userRepository.findById(request.teacherId())
                .filter(User::isEnabled)
                .filter(user -> user.getRole() == Role.TEACHER)
                .orElseThrow(() -> new IllegalArgumentException("Select an active teaching staff account."));

        boolean overlapping = timetableRepository
                .findByTermIgnoreCaseAndAcademicYearIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(term, year).stream()
                .filter(existing -> !existing.getId().equals(entry.getId()))
                .filter(existing -> existing.getDayOfWeek().equals(day))
                .filter(existing -> request.startTime().isBefore(existing.getEndTime())
                        && existing.getStartTime().isBefore(request.endTime()))
                .anyMatch(existing -> existing.getSchoolClass().getId().equals(schoolClass.getId())
                        || existing.getTeacher().getId().equals(teacher.getId()));
        if (overlapping) {
            throw new IllegalArgumentException("This class or teacher already has a lesson during that time.");
        }

        entry.setSchoolClass(schoolClass);
        entry.setSubject(subject);
        entry.setTeacher(teacher);
        entry.setDayOfWeek(day);
        entry.setStartTime(request.startTime());
        entry.setEndTime(request.endTime());
        entry.setRoom(request.room() == null ? null : request.room().trim());
        entry.setTerm(term);
        entry.setAcademicYear(year);
        return toDto(timetableRepository.save(entry));
    }

    private TimetableEntryDto toDto(TimetableEntry entry) {
        return new TimetableEntryDto(entry.getId(), entry.getSchoolClass().getId(),
                entry.getSchoolClass().getClassName(), entry.getSubject().getId(), entry.getSubject().getName(),
                entry.getTeacher().getId(), displayName(entry.getTeacher()), entry.getDayOfWeek(),
                entry.getStartTime(), entry.getEndTime(), entry.getRoom(), entry.getTerm(), entry.getAcademicYear());
    }

    private User currentTeacher(String username) {
        return userRepository.findByUsername(username)
                .filter(user -> user.getRole() == Role.TEACHER)
                .orElseThrow(() -> new IllegalArgumentException("Teacher account was not found."));
    }

    private SchoolSettings currentSettings() {
        return settingsRepository.findFirstByOrderByIdAsc().orElseGet(SchoolSettings::new);
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank())
            throw new IllegalArgumentException(message);
        return value.trim();
    }

    private String displayName(User user) {
        return user.getFullName() == null || user.getFullName().isBlank() ? user.getUsername() : user.getFullName();
    }
}