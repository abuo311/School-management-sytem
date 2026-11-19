package com.school.dto;

import java.util.List;

public record LmsExamSubmissionRequest(List<LmsExamAnswerRequest> answers) {
}
