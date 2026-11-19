import { useEffect, useRef, useState } from 'react';
import { Download, FileQuestion, Loader2, Pencil, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../services/api';

const emptyQuestion = () => ({
    type: 'MULTIPLE_CHOICE',
    prompt: '',
    points: 1,
    options: ['', '', '', ''],
    correctOptionIndex: 0
});

const emptyExam = () => ({
    title: '',
    description: '',
    maxAttempts: 1,
    timeLimitMinutes: '',
    published: false,
    questions: [emptyQuestion()]
});

const errorMessage = (error, fallback) =>
    error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : fallback);

const formatDate = value => value ? new Date(value).toLocaleString() : '—';

const LearningExams = ({ course, canManage, isStudent }) => {
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyExam);
    const [session, setSession] = useState(null);
    const [answers, setAnswers] = useState({});
    const [remainingSeconds, setRemainingSeconds] = useState(null);
    const [report, setReport] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const submitRef = useRef(null);
    const submittingRef = useRef(false);
    const draftTimerRef = useRef(null);
    const draftSaveQueueRef = useRef(Promise.resolve());
    const activeAttemptRef = useRef(null);

    const loadExams = async () => {
        const response = await API.get(`/lms/courses/${course.id}/exams`);
        setExams(response.data || []);
    };

    const loadResults = async () => {
        if (!canManage) return;
        const response = await API.get(`/lms/courses/${course.id}/exam-results`);
        setResults(response.data || []);
    };

    const refresh = async () => {
        const requests = [loadExams()];
        if (canManage) requests.push(loadResults());
        const settled = await Promise.allSettled(requests);
        const failed = settled.find(result => result.status === 'rejected');
        if (failed) throw failed.reason;
    };

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        Promise.all([API.get(`/lms/courses/${course.id}/exams`),
            canManage ? API.get(`/lms/courses/${course.id}/exam-results`) : Promise.resolve({ data: [] })])
            .then(([examResponse, resultResponse]) => {
                if (!active) return;
                setExams(examResponse.data || []);
                setResults(resultResponse.data || []);
            })
            .catch(requestError => {
                if (active) setError(errorMessage(requestError, 'Could not load course exams.'));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [course.id, canManage]);

    useEffect(() => {
        if (!session?.expiresAt) {
            setRemainingSeconds(null);
            return undefined;
        }
        const updateRemaining = () => {
            const seconds = Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
            setRemainingSeconds(seconds);
            if (seconds === 0) submitRef.current?.(true);
        };
        updateRemaining();
        const timer = window.setInterval(updateRemaining, 1000);
        return () => window.clearInterval(timer);
    }, [session]);

    const openEditor = async exam => {
        setError('');
        if (!exam) {
            setForm(emptyExam());
            setEditingId(null);
            setShowEditor(true);
            return;
        }
        try {
            const response = await API.get(`/lms/exams/${exam.id}/manage`);
            setForm({
                title: response.data.title,
                description: response.data.description || '',
                maxAttempts: response.data.maxAttempts,
                timeLimitMinutes: response.data.timeLimitMinutes || '',
                published: response.data.published,
                questions: response.data.questions.map(question => ({
                    type: question.type,
                    prompt: question.prompt,
                    points: question.points,
                    options: question.options.map(option => option.text),
                    correctOptionIndex: question.options.findIndex(option => option.correct)
                }))
            });
            setEditingId(exam.id);
            setShowEditor(true);
        } catch (requestError) {
            setError(errorMessage(requestError, 'Could not load this exam for editing.'));
        }
    };

    const updateQuestion = (index, updates) => {
        setForm(current => ({
            ...current,
            questions: current.questions.map((question, itemIndex) =>
                itemIndex === index ? { ...question, ...updates } : question)
        }));
    };

    const updateOption = (questionIndex, optionIndex, text) => {
        const question = form.questions[questionIndex];
        updateQuestion(questionIndex, {
            options: question.options.map((option, itemIndex) => itemIndex === optionIndex ? text : option)
        });
    };

    const changeQuestionType = (index, type) => {
        updateQuestion(index, {
            type,
            options: type === 'TRUE_FALSE' ? ['True', 'False'] : ['', '', '', ''],
            correctOptionIndex: 0
        });
    };

    const saveExam = async event => {
        event.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        const request = {
            ...form,
            maxAttempts: Number(form.maxAttempts),
            timeLimitMinutes: form.timeLimitMinutes ? Number(form.timeLimitMinutes) : null,
            questions: form.questions.map(question => ({
                ...question,
                points: Number(question.points),
                correctOptionIndex: Number(question.correctOptionIndex)
            }))
        };
        try {
            if (editingId) {
                await API.put(`/lms/exams/${editingId}`, request);
            } else {
                await API.post(`/lms/courses/${course.id}/exams`, request);
            }
            await refresh();
            setShowEditor(false);
            setEditingId(null);
            setForm(emptyExam());
            setNotice(editingId ? 'Exam updated.' : 'Exam created.');
        } catch (requestError) {
            setError(errorMessage(requestError, 'Could not save this exam.'));
        } finally {
            setBusy(false);
        }
    };

    const deleteExam = async exam => {
        if (!window.confirm(`Delete "${exam.title}" and all its attempt reports?`)) return;
        setError('');
        try {
            await API.delete(`/lms/exams/${exam.id}`);
            await refresh();
            setNotice('Exam deleted.');
        } catch (requestError) {
            setError(errorMessage(requestError, 'Could not delete this exam.'));
        }
    };

    const startExam = async exam => {
        setBusy(true);
        setError('');
        setReport(null);
        try {
            const response = await API.post(`/lms/exams/${exam.id}/attempts`);
            setSession({ ...response.data, examId: exam.id });
            activeAttemptRef.current = response.data.attemptId;
            setAnswers(Object.fromEntries((response.data.savedAnswers || [])
                .map(answer => [answer.questionId, answer.optionId])));
        } catch (requestError) {
            setError(errorMessage(requestError, 'Could not start this exam.'));
            try {
                await refresh();
            } catch (refreshError) {
                setError(current => `${current} ${errorMessage(refreshError, 'Exam status could not be refreshed.')}`);
            }
        } finally {
            setBusy(false);
        }
    };

    const submitExam = async timedOut => {
        if (!session || submittingRef.current) return;
        window.clearTimeout(draftTimerRef.current);
        submittingRef.current = true;
        setSubmitting(true);
        setError('');
        try {
            await draftSaveQueueRef.current;
            const response = await API.post(
                `/lms/exams/${session.examId}/attempts/${session.attemptId}/submit`,
                {
                    answers: Object.entries(answers).map(([questionId, optionId]) => ({
                        questionId: Number(questionId),
                        optionId: Number(optionId)
                    }))
                }
            );
            setReport(response.data);
            setSession(null);
            activeAttemptRef.current = null;
            setNotice(timedOut ? 'Time expired. Your exam was submitted and marked.' : 'Exam submitted and marked.');
            try {
                await refresh();
            } catch (refreshError) {
                setError(`Your exam was marked, but the exam list could not be refreshed. ${errorMessage(refreshError, 'Refresh failed.')}`);
            }
        } catch (requestError) {
            setError(errorMessage(requestError, 'Could not submit this exam.'));
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };
    submitRef.current = submitExam;

    const selectAnswer = (questionId, optionId) => {
        const nextAnswers = { ...answers, [questionId]: optionId };
        setAnswers(nextAnswers);
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = window.setTimeout(async () => {
            const attemptId = session.attemptId;
            const examId = session.examId;
            draftSaveQueueRef.current = draftSaveQueueRef.current
                .catch(() => undefined)
                .then(async () => {
                    if (activeAttemptRef.current !== attemptId || submittingRef.current) return;
                    try {
                        await API.put(`/lms/exams/${examId}/attempts/${attemptId}/answers`, {
                            answers: Object.entries(nextAnswers).map(([answerQuestionId, answerOptionId]) => ({
                                questionId: Number(answerQuestionId),
                                optionId: Number(answerOptionId)
                            }))
                        });
                    } catch (requestError) {
                        if (activeAttemptRef.current === attemptId && !submittingRef.current) {
                            setError(errorMessage(requestError, 'Your latest answer could not be saved.'));
                        }
                    }
                });
        }, 300);
    };

    const openReport = async (examId, attemptId) => {
        setError('');
        try {
            const response = await API.get(`/lms/exams/${examId}/attempts/${attemptId}/report`);
            setReport(response.data);
        } catch (requestError) {
            setError(errorMessage(requestError, 'Could not load this exam report.'));
        }
    };

    const downloadReport = result => {
        const pdf = new jsPDF();
        pdf.setFontSize(18);
        pdf.text(result.examTitle, 14, 18);
        pdf.setFontSize(11);
        pdf.text(`Student: ${result.studentName}`, 14, 28);
        pdf.text(`Class: ${result.className}`, 14, 35);
        pdf.text(`Submitted: ${formatDate(result.submittedAt)}`, 14, 42);
        pdf.text(`Score: ${result.score}/${result.maxScore} (${result.percentage}%)`, 14, 49);
        autoTable(pdf, {
            startY: 57,
            head: [['#', 'Question', 'Your answer', 'Correct answer', 'Marks']],
            body: result.answers.map((answer, index) => [
                index + 1,
                answer.prompt,
                answer.selectedAnswer || 'No answer',
                answer.correctAnswer,
                `${answer.pointsAwarded}/${answer.pointsPossible}`
            ]),
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 8 }, 4: { cellWidth: 20 } }
        });
        const safeName = result.studentName.replace(/[^a-z0-9]+/gi, '_');
        pdf.save(`${safeName}_${result.examTitle.replace(/[^a-z0-9]+/gi, '_')}_report.pdf`);
    };

    const printReport = () => {
        document.body.classList.add('lms-exam-printing');
        const clearPrintClass = () => document.body.classList.remove('lms-exam-printing');
        window.addEventListener('afterprint', clearPrintClass, { once: true });
        window.print();
        window.setTimeout(clearPrintClass, 1500);
    };

    const timeLabel = remainingSeconds === null
        ? ''
        : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;

    return (
        <section className="learning-panel lms-exams-panel mt-4">
            <div className="learning-panel-heading">
                <div>
                    <h2><FileQuestion size={20} className="me-2 text-primary" />Exams</h2>
                    <p>{canManage ? 'Create automatically marked exams and review student reports.' : 'Take course exams and review your marked results.'}</p>
                </div>
                {canManage && (
                    <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => openEditor()}>
                        <Plus size={16} />Create exam
                    </button>
                )}
            </div>

            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
            {notice && <div className="alert alert-success py-2" role="status">{notice}</div>}

            {showEditor && canManage && (
                <form className="lms-exam-editor mb-4" onSubmit={saveExam}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3 className="h5 mb-0">{editingId ? 'Edit exam' : 'Create exam'}</h3>
                        <button type="button" className="btn btn-sm btn-light" onClick={() => setShowEditor(false)}
                            aria-label="Close exam editor"><X size={16} /></button>
                    </div>
                    <div className="row g-3">
                        <div className="col-md-7">
                            <label className="form-label" htmlFor="exam-title">Exam title</label>
                            <input id="exam-title" className="form-control" maxLength="120" required
                                value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label" htmlFor="exam-attempts">Attempts</label>
                            <input id="exam-attempts" className="form-control" type="number" min="1" max="20" required
                                value={form.maxAttempts} onChange={event => setForm(current => ({ ...current, maxAttempts: event.target.value }))} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label" htmlFor="exam-time-limit">Time limit (minutes)</label>
                            <input id="exam-time-limit" className="form-control" type="number" min="1" max="300"
                                placeholder="No limit" value={form.timeLimitMinutes}
                                onChange={event => setForm(current => ({ ...current, timeLimitMinutes: event.target.value }))} />
                        </div>
                        <div className="col-12">
                            <label className="form-label" htmlFor="exam-description">Instructions</label>
                            <textarea id="exam-description" className="form-control" rows="2" maxLength="5000"
                                value={form.description}
                                onChange={event => setForm(current => ({ ...current, description: event.target.value }))} />
                        </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-4 mb-2">
                        <h4 className="h6 mb-0">Questions</h4>
                        <button type="button" className="btn btn-sm btn-outline-primary"
                            onClick={() => setForm(current => ({ ...current, questions: [...current.questions, emptyQuestion()] }))}
                            disabled={form.questions.length >= 100}><Plus size={14} className="me-1" />Add question</button>
                    </div>
                    <div className="d-grid gap-3">
                        {form.questions.map((question, index) => (
                            <div className="lms-exam-question-editor" key={index}>
                                <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                                    <strong>Question {index + 1}</strong>
                                    <div className="d-flex gap-2 align-items-center">
                                        <select className="form-select form-select-sm" aria-label={`Question ${index + 1} type`}
                                            value={question.type} onChange={event => changeQuestionType(index, event.target.value)}>
                                            <option value="MULTIPLE_CHOICE">Multiple choice</option>
                                            <option value="TRUE_FALSE">True / False</option>
                                        </select>
                                        <button type="button" className="btn btn-sm btn-outline-danger"
                                            aria-label={`Remove question ${index + 1}`} onClick={() =>
                                                setForm(current => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index) }))
                                            } disabled={form.questions.length <= 1}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <label className="form-label" htmlFor={`question-prompt-${index}`}>Question text</label>
                                <textarea id={`question-prompt-${index}`} className="form-control mb-2" rows="2" maxLength="2000"
                                    required value={question.prompt}
                                    onChange={event => updateQuestion(index, { prompt: event.target.value })} />
                                <div className="row g-2">
                                    {question.options.map((option, optionIndex) => (
                                        <div className="col-md-6" key={optionIndex}>
                                            <div className="input-group">
                                                <div className="input-group-text">
                                                    <input type="radio" name={`correct-${index}`}
                                                        aria-label={`Set option ${optionIndex + 1} as correct for question ${index + 1}`}
                                                        checked={question.correctOptionIndex === optionIndex}
                                                        onChange={() => updateQuestion(index, { correctOptionIndex: optionIndex })} />
                                                </div>
                                                <input className="form-control" maxLength="500" required
                                                    aria-label={`Question ${index + 1} option ${optionIndex + 1}`}
                                                    value={option} disabled={question.type === 'TRUE_FALSE'}
                                                    onChange={event => updateOption(index, optionIndex, event.target.value)} />
                                                {question.type === 'MULTIPLE_CHOICE' && question.options.length > 2 && (
                                                    <button className="btn btn-outline-secondary" type="button" title="Remove option"
                                                        onClick={() => updateQuestion(index, {
                                                            options: question.options.filter((_, itemIndex) => itemIndex !== optionIndex),
                                                            correctOptionIndex: question.correctOptionIndex === optionIndex
                                                                ? 0
                                                                : question.correctOptionIndex > optionIndex
                                                                    ? question.correctOptionIndex - 1
                                                                    : question.correctOptionIndex
                                                        })}><X size={14} /></button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {question.type === 'MULTIPLE_CHOICE' && question.options.length < 6 && (
                                    <button type="button" className="btn btn-sm btn-link px-0"
                                        onClick={() => updateQuestion(index, { options: [...question.options, ''] })}>
                                        <Plus size={13} /> Add option
                                    </button>
                                )}
                                <label className="d-flex align-items-center gap-2 mt-2 small">
                                    Points
                                    <input type="number" className="form-control form-control-sm lms-points-input" min="1" max="100" required
                                        value={question.points}
                                        onChange={event => updateQuestion(index, { points: event.target.value })} />
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3">
                        <label className="form-check d-flex align-items-center gap-2 mb-0">
                            <input type="checkbox" className="form-check-input mt-0" checked={form.published}
                                onChange={event => setForm(current => ({ ...current, published: event.target.checked }))} />
                            <span>Published and available to students</span>
                        </label>
                        <button className="btn btn-primary" disabled={busy}>
                            {busy ? <Loader2 size={16} className="animate-spin me-1" /> : <Save size={16} className="me-1" />}
                            {editingId ? 'Save exam' : 'Create exam'}
                        </button>
                    </div>
                </form>
            )}

            {session && (
                <div className="lms-active-exam mb-4">
                    <header className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                        <div>
                            <h3 className="h5 mb-1">{session.title}</h3>
                            {session.description && <p className="text-muted mb-0">{session.description}</p>}
                        </div>
                        {remainingSeconds !== null && <span className="badge text-bg-warning fs-6">Time left: {timeLabel}</span>}
                    </header>
                    <form onSubmit={event => { event.preventDefault(); submitExam(false); }}>
                        {session.questions.map((question, index) => (
                            <fieldset className="lms-exam-live-question mb-3" key={question.id}>
                                <legend>{index + 1}. {question.prompt} <small>({question.points} {question.points === 1 ? 'point' : 'points'})</small></legend>
                                {question.options.map(option => (
                                    <label className="lms-exam-choice" key={option.id}>
                                        <input type="radio" name={`answer-${question.id}`}
                                            checked={String(answers[question.id] || '') === String(option.id)}
                                            onChange={() => selectAnswer(question.id, option.id)} />
                                        <span>{option.text}</span>
                                    </label>
                                ))}
                            </fieldset>
                        ))}
                        <button className="btn btn-success" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit exam'}
                        </button>
                    </form>
                </div>
            )}

            {report && (
                <div className="lms-exam-report-card mb-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                        <div>
                            <span className="learning-kicker">EXAM REPORT</span>
                            <h3 className="h4 mt-1 mb-1">{report.examTitle}</h3>
                            <p className="text-muted mb-1">{report.studentName} · {report.className}</p>
                            <p className="small text-muted mb-0">Submitted {formatDate(report.submittedAt)}</p>
                        </div>
                        <div className="lms-exam-score">{report.score}/{report.maxScore}<small>{report.percentage}%</small></div>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-sm table-bordered align-middle">
                            <thead><tr><th>#</th><th>Question</th><th>Your answer</th><th>Correct answer</th><th>Marks</th></tr></thead>
                            <tbody>{report.answers.map((answer, index) => (
                                <tr key={`${report.attemptId}-${index}`}>
                                    <td>{index + 1}</td><td>{answer.prompt}</td>
                                    <td>{answer.selectedAnswer || 'No answer'}</td>
                                    <td>{answer.correctAnswer}</td>
                                    <td className={answer.correct ? 'text-success fw-bold' : 'text-danger'}>
                                        {answer.pointsAwarded}/{answer.pointsPossible}
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                    <div className="d-flex flex-wrap gap-2 lms-report-actions">
                        <button className="btn btn-outline-primary btn-sm" onClick={printReport}><Printer size={15} className="me-1" />Print report</button>
                        <button className="btn btn-primary btn-sm" onClick={() => downloadReport(report)}><Download size={15} className="me-1" />Download PDF</button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setReport(null)}>Close report</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-3 text-center text-muted"><Loader2 size={18} className="animate-spin me-2" />Loading exams...</div>
            ) : exams.length === 0 ? (
                <p className="text-muted mb-0">{canManage ? 'No exams yet. Create an exam to assess this course.' : 'No published exams are available yet.'}</p>
            ) : (
                <div className="d-grid gap-2">
                    {exams.map(exam => (
                        <article className="lms-exam-row" key={exam.id}>
                            <div>
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                    <strong>{exam.title}</strong>
                                    {canManage && <span className={`badge ${exam.published ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                        {exam.published ? 'Published' : 'Draft'}
                                    </span>}
                                </div>
                                <small className="text-muted">
                                    {exam.questionCount} questions · {exam.totalPoints} points · {exam.timeLimitMinutes ? `${exam.timeLimitMinutes} min` : 'No time limit'}
                                    {isStudent && ` · ${exam.attemptsUsed}/${exam.maxAttempts} attempts used`}
                                    {isStudent && exam.bestScore !== null && ` · Best: ${exam.bestScore}/${exam.totalPoints}`}
                                    {canManage && ` · ${exam.attemptsUsed} attempts`}
                                </small>
                            </div>
                            <div className="d-flex flex-wrap gap-1">
                                {isStudent && exam.latestAttemptId && (
                                    <button className="btn btn-sm btn-outline-secondary"
                                        onClick={() => openReport(exam.id, exam.latestAttemptId)}>Latest report</button>
                                )}
                                {isStudent && (exam.activeAttemptId || exam.attemptsUsed < exam.maxAttempts) && (
                                    <button className="btn btn-sm btn-primary" disabled={busy}
                                        onClick={() => startExam(exam)}>{exam.activeAttemptId ? 'Resume exam' : 'Start exam'}</button>
                                )}
                                {canManage && exam.attemptsUsed === 0 && (
                                    <button className="btn btn-sm btn-outline-primary" title="Edit exam"
                                        onClick={() => openEditor(exam)}><Pencil size={14} /></button>
                                )}
                                {canManage && (
                                    <button className="btn btn-sm btn-outline-danger" title="Delete exam"
                                        onClick={() => deleteExam(exam)}><Trash2 size={14} /></button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {canManage && results.length > 0 && (
                <section className="mt-4">
                    <h3 className="h6 fw-bold">Student results</h3>
                    <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle">
                            <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Submitted</th><th>Report</th></tr></thead>
                            <tbody>{results.map(result => (
                                <tr key={result.attemptId}>
                                    <td>{result.studentName}<small className="d-block text-muted">{result.admissionNumber}</small></td>
                                    <td>{result.examTitle}</td>
                                    <td>{result.score}/{result.maxScore} ({result.percentage}%)</td>
                                    <td>{formatDate(result.submittedAt)}</td>
                                    <td><button className="btn btn-sm btn-outline-primary"
                                        onClick={() => openReport(result.examId, result.attemptId)}>View report</button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </section>
            )}
        </section>
    );
};

export default LearningExams;
