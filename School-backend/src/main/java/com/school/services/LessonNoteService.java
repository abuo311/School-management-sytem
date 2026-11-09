package com.school.services;

import com.school.dto.LessonNoteDto;
import com.school.dto.LessonNoteAttachmentDto;
import com.school.dto.LessonNoteRequest;
import com.school.entities.LessonNoteAttachment;
import com.school.entities.LessonNote;
import com.school.entities.Role;
import com.school.entities.TimetableEntry;
import com.school.entities.User;
import com.school.repositories.LessonNoteRepository;
import com.school.repositories.LessonNoteAttachmentRepository;
import com.school.repositories.TimetableEntryRepository;
import com.school.repositories.UserRepository;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class LessonNoteService {

    private static final long IMAGE_MAX_BYTES = 3L * 1024 * 1024;
    private static final long VIDEO_MAX_BYTES = 5L * 1024 * 1024;
    private static final long PDF_MAX_BYTES = 10L * 1024 * 1024;
    private static final Safelist NOTE_FORMATTING = Safelist.none()
            .addTags("p", "div", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li");

    private final LessonNoteRepository noteRepository;
    private final LessonNoteAttachmentRepository attachmentRepository;
    private final TimetableEntryRepository timetableRepository;
    private final UserRepository userRepository;

    public LessonNoteService(LessonNoteRepository noteRepository,
            LessonNoteAttachmentRepository attachmentRepository,
            TimetableEntryRepository timetableRepository, UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.attachmentRepository = attachmentRepository;
        this.timetableRepository = timetableRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<LessonNoteDto> list(String username, boolean administrator, LocalDate date) {
        User currentUser = administrator ? null : findTeacher(username);
        List<LessonNote> notes = date == null
                ? noteRepository.findAllByOrderByLessonDateDescUpdatedAtDesc()
                : noteRepository.findByLessonDateOrderByUpdatedAtDesc(date);
        return notes.stream()
                .filter(note -> administrator
                        || note.getTimetableEntry().getTeacher().getId().equals(currentUser.getId()))
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public LessonNoteDto create(String username, boolean administrator, LessonNoteRequest request) {
        validate(request);
        User author = findUser(username);
        TimetableEntry entry = timetableRepository.findById(request.timetableEntryId())
                .orElseThrow(() -> new IllegalArgumentException("Timetable entry was not found."));
        validateScheduledDate(entry, request.lessonDate());
        requireCanEdit(entry, author, administrator);
        LessonNote note = noteRepository.findByTimetableEntryIdAndLessonDate(entry.getId(), request.lessonDate())
                .orElseGet(LessonNote::new);
        if (note.getId() == null) {
            note.setCreatedAt(LocalDateTime.now());
        }
        apply(note, entry, author, request);
        return toDto(noteRepository.save(note));
    }

    @Transactional
    public LessonNoteDto update(Long id, String username, boolean administrator, LessonNoteRequest request) {
        validate(request);
        LessonNote note = noteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lesson note was not found."));
        User author = findUser(username);
        TimetableEntry entry = timetableRepository.findById(request.timetableEntryId())
                .orElseThrow(() -> new IllegalArgumentException("Timetable entry was not found."));
        validateScheduledDate(entry, request.lessonDate());
        requireCanEdit(entry, author, administrator);
        if (!note.getTimetableEntry().getId().equals(entry.getId())
                || !note.getLessonDate().equals(request.lessonDate())) {
            throw new IllegalArgumentException("Edit the existing note without changing its scheduled lesson or date.");
        }
        apply(note, entry, author, request);
        return toDto(noteRepository.save(note));
    }

    @Transactional
    public void delete(Long id, String username, boolean administrator) {
        LessonNote note = noteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lesson note was not found."));
        User author = findUser(username);
        requireCanEdit(note.getTimetableEntry(), author, administrator);
        noteRepository.delete(note);
    }

    @Transactional
    public LessonNoteAttachmentDto uploadAttachment(Long noteId, String username, boolean administrator,
            MultipartFile file) throws IOException {
        LessonNote note = findEditableNote(noteId, username, administrator);
        AttachmentType type = validateAttachment(file);
        String fileName = safeFileName(file.getOriginalFilename());
        LessonNoteAttachment attachment = new LessonNoteAttachment();
        attachment.setLessonNote(note);
        attachment.setFileName(fileName);
        attachment.setContentType(type.contentType());
        attachment.setFileSize(file.getSize());
        byte[] fileData = file.getBytes();
        if (!hasValidSignature(fileData, type.contentType())) {
            throw new IllegalArgumentException("The selected file does not match its declared media type.");
        }
        attachment.setFileData(fileData);
        return toAttachmentDto(attachmentRepository.save(attachment));
    }

    @Transactional(readOnly = true)
    public LessonNoteAttachment getAttachment(Long noteId, Long attachmentId, String username,
            boolean administrator) {
        findEditableNote(noteId, username, administrator);
        return attachmentRepository.findByIdAndLessonNoteId(attachmentId, noteId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson note attachment was not found."));
    }

    @Transactional
    public void deleteAttachment(Long noteId, Long attachmentId, String username, boolean administrator) {
        findEditableNote(noteId, username, administrator);
        LessonNoteAttachment attachment = attachmentRepository.findByIdAndLessonNoteId(attachmentId, noteId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson note attachment was not found."));
        attachmentRepository.delete(attachment);
    }

    private LessonNote findEditableNote(Long noteId, String username, boolean administrator) {
        LessonNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson note was not found."));
        requireCanEdit(note.getTimetableEntry(), findUser(username), administrator);
        return note;
    }

    private void requireCanEdit(TimetableEntry entry, User currentUser, boolean administrator) {
        if (!administrator && (currentUser.getRole() != Role.TEACHER
                || !entry.getTeacher().getId().equals(currentUser.getId()))) {
            throw new IllegalArgumentException("You can only manage lesson notes for your own timetable.");
        }
    }

    private void validate(LessonNoteRequest request) {
        if (request == null || request.timetableEntryId() == null || request.lessonDate() == null
                || request.topic() == null || request.topic().isBlank()
                || !hasFormattedText(request.learningObjectives())
                || !hasFormattedText(request.lessonActivities())) {
            throw new IllegalArgumentException(
                    "Scheduled lesson, date, topic, objectives and activities are required.");
        }
    }

    private AttachmentType validateAttachment(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Choose a non-empty image, video or PDF file.");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);

        if (name.matches(".*\\.(jpg|jpeg|png|gif|webp)$")
                && List.of("image/jpeg", "image/png", "image/gif", "image/webp").contains(contentType)) {
            return validateSize(file, IMAGE_MAX_BYTES, "Images must be 3 MiB or smaller.",
                    new AttachmentType(contentType));
        }
        if (name.matches(".*\\.(mp4|webm|mov|ogv)$")
                && List.of("video/mp4", "video/webm", "video/quicktime", "video/ogg").contains(contentType)) {
            return validateSize(file, VIDEO_MAX_BYTES, "Videos must be 5 MiB or smaller.",
                    new AttachmentType(contentType));
        }
        if (name.endsWith(".pdf") && "application/pdf".equals(contentType)) {
            return validateSize(file, PDF_MAX_BYTES, "PDF files must be 10 MiB or smaller.",
                    new AttachmentType(contentType));
        }
        throw new IllegalArgumentException("Only JPEG, PNG, GIF or WebP images, MP4, WebM, MOV or OGV videos, and PDF files are allowed.");
    }

    private AttachmentType validateSize(MultipartFile file, long maxBytes, String message, AttachmentType type) {
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException(message);
        }
        return type;
    }

    private boolean hasValidSignature(byte[] data, String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> startsWith(data, 0xFF, 0xD8, 0xFF);
            case "image/png" -> startsWith(data, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
            case "image/gif" -> startsWith(data, "GIF87a".getBytes(StandardCharsets.US_ASCII))
                    || startsWith(data, "GIF89a".getBytes(StandardCharsets.US_ASCII));
            case "image/webp" -> startsWith(data, "RIFF".getBytes(StandardCharsets.US_ASCII))
                    && containsAt(data, "WEBP".getBytes(StandardCharsets.US_ASCII), 8);
            case "application/pdf" -> startsWith(data, "%PDF-".getBytes(StandardCharsets.US_ASCII));
            case "video/mp4" -> containsAt(data, "ftyp".getBytes(StandardCharsets.US_ASCII), 4);
            case "video/quicktime" -> containsAt(data, "ftyp".getBytes(StandardCharsets.US_ASCII), 4)
                    && containsAt(data, "qt  ".getBytes(StandardCharsets.US_ASCII), 8);
            case "video/webm" -> startsWith(data, 0x1A, 0x45, 0xDF, 0xA3);
            case "video/ogg" -> startsWith(data, "OggS".getBytes(StandardCharsets.US_ASCII));
            default -> false;
        };
    }

    private boolean startsWith(byte[] data, int... signature) {
        if (data.length < signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if ((data[index] & 0xFF) != signature[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean startsWith(byte[] data, byte[] signature) {
        return containsAt(data, signature, 0);
    }

    private boolean containsAt(byte[] data, byte[] signature, int offset) {
        if (data.length < offset + signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if (data[offset + index] != signature[index]) {
                return false;
            }
        }
        return true;
    }

    private String safeFileName(String originalFilename) {
        String fileName = originalFilename.replace('\\', '/');
        fileName = fileName.substring(fileName.lastIndexOf('/') + 1).trim();
        if (fileName.isEmpty() || fileName.length() > 255) {
            throw new IllegalArgumentException("The file name must be between 1 and 255 characters.");
        }
        return fileName;
    }

    private boolean hasFormattedText(String value) {
        return value != null && !Jsoup.parse(cleanFormatted(value)).text().isBlank();
    }

    private String cleanFormatted(String value) {
        return value == null ? null : Jsoup.clean(value, NOTE_FORMATTING);
    }

    private void validateScheduledDate(TimetableEntry entry, LocalDate date) {
        if (!entry.getDayOfWeek().equalsIgnoreCase(date.getDayOfWeek().name())) {
            throw new IllegalArgumentException("Lesson date must fall on the linked timetable day.");
        }
    }

    private void apply(LessonNote note, TimetableEntry entry, User author, LessonNoteRequest request) {
        note.setTimetableEntry(entry);
        note.setAuthor(author);
        note.setLessonDate(request.lessonDate());
        note.setTopic(request.topic().trim());
        note.setLearningObjectives(cleanFormatted(request.learningObjectives()));
        note.setLessonActivities(cleanFormatted(request.lessonActivities()));
        note.setTeachingResources(cleanOptionalFormatted(request.teachingResources()));
        note.setHomework(cleanOptionalFormatted(request.homework()));
        note.setUpdatedAt(LocalDateTime.now());
    }

    private LessonNoteDto toDto(LessonNote note) {
        TimetableEntry entry = note.getTimetableEntry();
        User teacher = entry.getTeacher();
        String teacherName = teacher.getFullName() == null || teacher.getFullName().isBlank()
                ? teacher.getUsername()
                : teacher.getFullName();
        return new LessonNoteDto(note.getId(), entry.getId(), note.getLessonDate(),
                entry.getSchoolClass().getClassName(), entry.getSubject().getName(), teacherName,
                entry.getDayOfWeek(), entry.getStartTime(), entry.getEndTime(), note.getTopic(),
                note.getLearningObjectives(), note.getLessonActivities(), note.getTeachingResources(),
                note.getHomework(), note.getAttachments().stream().map(this::toAttachmentDto).toList());
    }

    private LessonNoteAttachmentDto toAttachmentDto(LessonNoteAttachment attachment) {
        return new LessonNoteAttachmentDto(attachment.getId(), attachment.getFileName(),
                attachment.getContentType(), attachment.getFileSize());
    }

    private User findTeacher(String username) {
        User user = findUser(username);
        if (user.getRole() != Role.TEACHER) {
            throw new IllegalArgumentException("Teacher account was not found.");
        }
        return user;
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Staff account was not found."));
    }

    private String cleanOptionalFormatted(String value) {
        String cleaned = cleanFormatted(value);
        return cleaned == null || Jsoup.parse(cleaned).text().isBlank() ? null : cleaned;
    }

    private record AttachmentType(String contentType) {
    }
}