package com.school.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "lesson_notes", uniqueConstraints = @UniqueConstraint(name = "uk_lesson_note_entry_date", columnNames = {
        "timetable_entry_id", "lesson_date" }))
public class LessonNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "timetable_entry_id", nullable = false)
    private TimetableEntry timetableEntry;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "lesson_date", nullable = false)
    private LocalDate lessonDate;

    @Column(nullable = false, length = 200)
    private String topic;

    @Column(name = "learning_objectives", nullable = false, columnDefinition = "TEXT")
    private String learningObjectives;

    @Column(name = "lesson_activities", nullable = false, columnDefinition = "TEXT")
    private String lessonActivities;

    @Column(name = "teaching_resources", columnDefinition = "TEXT")
    private String teachingResources;

    @Column(columnDefinition = "TEXT")
    private String homework;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}