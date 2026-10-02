import React, { useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import { BookOpenText, Loader2, Plus, Save, Trash2, X } from 'lucide-react';

const todayLocal = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const dayForDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
const blankNote = { timetableEntryId: '', lessonDate: todayLocal(), topic: '', learningObjectives: '', lessonActivities: '', teachingResources: '', homework: '' };

const LessonNotes = () => {
    const [timetable, setTimetable] = useState([]);
    const [notes, setNotes] = useState([]);
    const [form, setForm] = useState(blankNote);
    const [editingId, setEditingId] = useState(null);
    const [filterDate, setFilterDate] = useState(todayLocal);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadTimetable();
    }, []);

    useEffect(() => {
        loadNotes();
    }, [filterDate]);

    async function loadTimetable() {
        setLoading(true);
        try {
            const response = await API.get('/timetable');
            setTimetable(response.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to load your timetable.');
        } finally {
            setLoading(false);
        }
    }

    async function loadNotes() {
        setError('');
        try {
            const response = await API.get('/lesson-notes', { params: { date: filterDate } });
            setNotes(response.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to load lesson notes.');
        }
    }

    const lessonsForDate = useMemo(() => timetable
        .filter(entry => entry.dayOfWeek === dayForDate(form.lessonDate))
        .sort((first, second) => first.startTime.localeCompare(second.startTime)), [timetable, form.lessonDate]);

    const resetForm = () => {
        setForm({ ...blankNote, lessonDate: filterDate });
        setEditingId(null);
    };

    const saveNote = async event => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const payload = { ...form, timetableEntryId: Number(form.timetableEntryId) };
            if (editingId) await API.put(`/lesson-notes/${editingId}`, payload);
            else await API.post('/lesson-notes', payload);
            setFilterDate(form.lessonDate);
            setSuccess('Lesson note saved.');
            resetForm();
            const response = await API.get('/lesson-notes', { params: { date: form.lessonDate } });
            setNotes(response.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to save lesson note.');
        } finally {
            setSaving(false);
        }
    };

    const editNote = note => {
        setEditingId(note.id);
        setForm({
            timetableEntryId: String(note.timetableEntryId),
            lessonDate: note.lessonDate,
            topic: note.topic,
            learningObjectives: note.learningObjectives,
            lessonActivities: note.lessonActivities,
            teachingResources: note.teachingResources || '',
            homework: note.homework || ''
        });
    };

    const deleteNote = async note => {
        if (!window.confirm(`Delete lesson note “${note.topic}”?`)) return;
        try {
            await API.delete(`/lesson-notes/${note.id}`);
            setNotes(current => current.filter(item => item.id !== note.id));
            setSuccess('Lesson note deleted.');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to delete lesson note.');
        }
    };

    return (
        <div className="container-fluid py-4 text-start">
            <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h3 className="fw-bold mb-1"><BookOpenText className="me-2 text-primary" size={24} />Lesson Notes</h3>
                    <p className="text-muted small mb-0">Plan lesson objectives, activities, resources and homework</p>
                </div>
                <label className="small fw-semibold">Notes for date <input aria-label="Filter notes by date" type="date" className="form-control mt-1" value={filterDate} onChange={event => setFilterDate(event.target.value)} /></label>
            </header>

            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
            {success && <div className="alert alert-success py-2" role="status">{success}</div>}

            <div className="row g-4">
                <div className="col-xl-5">
                    <form className="bg-white border rounded p-3" onSubmit={saveNote}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold mb-0">{editingId ? 'Edit lesson note' : 'Prepare lesson note'}</h6>
                            {editingId && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetForm}><X size={15} /> Cancel</button>}
                        </div>
                        <div className="mb-3">
                            <label className="form-label small fw-semibold">Lesson date</label>
                            <input type="date" required disabled={Boolean(editingId)} className="form-control" value={form.lessonDate} onChange={event => setForm({ ...form, lessonDate: event.target.value, timetableEntryId: '' })} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label small fw-semibold">Scheduled lesson</label>
                            <select required disabled={Boolean(editingId)} className="form-select" value={form.timetableEntryId} onChange={event => setForm({ ...form, timetableEntryId: event.target.value })}>
                                <option value="">Select timetable slot</option>
                                {lessonsForDate.map(entry => <option key={entry.id} value={entry.id}>{entry.startTime} · {entry.className} · {entry.subjectName}</option>)}
                            </select>
                            {lessonsForDate.length === 0 && <small className="text-muted">No timetable slots for {dayForDate(form.lessonDate).toLowerCase()}; add this lesson to the timetable first.</small>}
                        </div>
                        <div className="mb-3"><label className="form-label small fw-semibold">Topic</label><input required maxLength="200" className="form-control" value={form.topic} onChange={event => setForm({ ...form, topic: event.target.value })} /></div>
                        <div className="mb-3"><label className="form-label small fw-semibold">Learning objectives</label><textarea required rows="2" className="form-control" value={form.learningObjectives} onChange={event => setForm({ ...form, learningObjectives: event.target.value })} /></div>
                        <div className="mb-3"><label className="form-label small fw-semibold">Lesson activities</label><textarea required rows="3" className="form-control" value={form.lessonActivities} onChange={event => setForm({ ...form, lessonActivities: event.target.value })} /></div>
                        <div className="mb-3"><label className="form-label small fw-semibold">Teaching resources</label><textarea rows="2" className="form-control" value={form.teachingResources} onChange={event => setForm({ ...form, teachingResources: event.target.value })} /></div>
                        <div className="mb-3"><label className="form-label small fw-semibold">Homework</label><textarea rows="2" className="form-control" value={form.homework} onChange={event => setForm({ ...form, homework: event.target.value })} /></div>
                        <button className="btn btn-dark d-flex align-items-center gap-2" disabled={saving || loading || lessonsForDate.length === 0}>
                            {saving ? <Loader2 size={17} className="animate-spin" /> : editingId ? <Save size={17} /> : <Plus size={17} />}
                            {editingId ? 'Update note' : 'Save lesson note'}
                        </button>
                    </form>
                </div>

                <div className="col-xl-7">
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                        <h5 className="fw-bold mb-0">Saved notes</h5><span className="badge bg-light text-dark border">{notes.length}</span>
                    </div>
                    {loading ? <div className="py-4 text-center text-muted"><Loader2 className="animate-spin me-2" />Loading...</div> : notes.length === 0 ? (
                        <div className="bg-white border rounded p-4 text-center text-muted">No lesson notes saved for this date.</div>
                    ) : <div className="d-grid gap-3">
                        {notes.map(note => <article key={note.id} className="bg-white border rounded p-3">
                            <div className="d-flex justify-content-between gap-3">
                                <div>
                                    <div className="small text-muted">{note.startTime}–{note.endTime} · {note.className} · {note.subjectName}</div>
                                    <h6 className="fw-bold mt-1 mb-2">{note.topic}</h6>
                                </div>
                                <div className="d-flex align-items-start gap-2">
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => editNote(note)} title="Edit note"><Save size={15} /></button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteNote(note)} title="Delete note"><Trash2 size={15} /></button>
                                </div>
                            </div>
                            <div className="small"><strong>Objectives:</strong><p className="mb-2 text-break">{note.learningObjectives}</p><strong>Activities:</strong><p className="mb-2 text-break">{note.lessonActivities}</p>
                                {note.teachingResources && <><strong>Resources:</strong><p className="mb-2 text-break">{note.teachingResources}</p></>}
                                {note.homework && <><strong>Homework:</strong><p className="mb-0 text-break">{note.homework}</p></>}
                            </div>
                        </article>)}
                    </div>}
                </div>
            </div>
        </div>
    );
};

export default LessonNotes;
