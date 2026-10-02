package com.school.repositories;

import com.school.entities.TimetableEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Long> {
    List<TimetableEntry> findByTermIgnoreCaseAndAcademicYearIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
            String term, String academicYear);

    List<TimetableEntry> findByTeacherIdAndTermIgnoreCaseAndAcademicYearIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
            Long teacherId, String term, String academicYear);
}