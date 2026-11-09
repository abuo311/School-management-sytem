import React, { useEffect, useMemo, useRef, useState } from 'react';
import API from '../services/api';
import { Bold, BookOpenText, Download, Italic, List, ListOrdered, Loader2, Paperclip, Plus, Save, Trash2, Underline, X } from 'lucide-react';

const todayLocal = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const dayForDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
const blankNote = { timetableEntryId: '', lessonDate: todayLocal(), topic: '', learningObjectives: '', lessonActivities: '', teachingResources: '', homework: '' };
const allowedFormattingTags = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI']);

const sanitizeRichText = html => {
    if (!html) return '';
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const cleanNode = node => {
        if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
        const fragment = document.createDocumentFragment();
        if (node.nodeType !== Node.ELEMENT_NODE) return fragment;
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG'].includes(node.tagName)) return fragment;
        const target = allowedFormattingTags.has(node.tagName) ? parsed.createElement(node.tagName.toLowerCase()) : fragment;
        Array.from(node.childNodes).forEach(child => target.appendChild(cleanNode(child)));
        return target;
    };
    const container = document.createElement('div');
    Array.from(parsed.body.childNodes).forEach(node => container.appendChild(cleanNode(node)));
    return container.innerHTML;
};

const fileSizeLimit = file => {
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return 3 * 1024 * 1024;
    if (['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'].includes(file.type)) return 5 * 1024 * 1024;
    if (file.type === 'application/pdf') return 10 * 1024 * 1024;
    return 0;
};

const formatFileSize = bytes => `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;

const RichTextEditor = ({ label, value, onChange, minHeight }) => {
    const editorRef = useRef(null);
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = sanitizeRichText(value);
        }
    }, [value]);

    const updateContent = event => onChange(event.currentTarget.innerHTML);
    const pastePlainText = event => {
        event.preventDefault();
        document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    };
    const applyFormat = (event, command) => {
        event.preventDefault();
        document.execCommand(command, false);
        const editor = event.currentTarget.parentElement.nextElementSibling;
        onChange(editor.innerHTML);
        editor.focus();
    };
    const formats = [
        { label: 'Bold', command: 'bold', Icon: Bold },
        { label: 'Italic', command: 'italic', Icon: Italic },
        { label: 'Underline', command: 'underline', Icon: Underline },
        { label: 'Bulleted list', command: 'insertUnorderedList', Icon: List },
        { label: 'Numbered list', command: 'insertOrderedList', Icon: ListOrdered }
    ];

    return (
        <div className="mb-3">
            <label className="form-label small fw-semibold">{label}</label>
            <div className="d-flex gap-1 border border-bottom-0 rounded-top p-1 bg-light">
                {formats.map(({ label: formatLabel, command, Icon }) => (
                    <button key={command} type="button" className="btn btn-sm btn-outline-secondary py-1 px-2"
                        aria-label={`${formatLabel} formatting`} title={formatLabel}
                        onMouseDown={event => event.preventDefault()} onClick={event => applyFormat(event, command)}>
                        <Icon size={15} />
                    </button>
                ))}
                <span className="small text-muted align-self-center ms-1">Twi and other Unicode text supported</span>
            </div>
            <div ref={editorRef} className="form-control rounded-top-0" contentEditable suppressContentEditableWarning
                role="textbox" aria-multiline="true" aria-label={label}
                style={{ minHeight, whiteSpace: 'pre-wrap', overflowY: 'auto' }}
                onInput={updateContent} onPaste={pastePlainText} onDrop={event => event.preventDefault()} />
        </div>
    );
};

const LessonNotes = () => {
    const [timetable, setTimetable] = useState([]);
    const [notes, setNotes] = useState([]);
    const [form, setForm] = useState(blankNote);
    const [editingId, setEditingId] = useState(null);
    const [filterDate, setFilterDate] = useState(todayLocal);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filePickerKey, setFilePickerKey] = useState(0);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
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

    const resetForm = (date = filterDate) => {
        setForm({ ...blankNote, lessonDate: date });
        setEditingId(null);
        setSelectedFiles([]);
        setExistingAttachments([]);
        setFilePickerKey(key => key + 1);
    };

    const saveNote = async event => {
        event.preventDefault();
        const invalidFile = selectedFiles.find(file => !fileSizeLimit(file) || file.size > fileSizeLimit(file));
        if (invalidFile) {
            setError(!fileSizeLimit(invalidFile)
                ? 'Choose a JPEG, PNG, GIF or WebP image, MP4, WebM, MOV or OGV video, or PDF file.'
                : `File size limit exceeded for ${invalidFile.name}. Images are limited to 3 MiB, videos to 5 MiB and PDFs to 10 MiB.`);
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');
        let savedNote;
        try {
            const payload = { ...form, timetableEntryId: Number(form.timetableEntryId) };
            const response = editingId
                ? await API.put(`/lesson-notes/${editingId}`, payload)
                : await API.post('/lesson-notes', payload);
            savedNote = response.data;
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to save lesson note.');
            setSaving(false);
            return;
        }

        try {
            for (const file of selectedFiles) {
                const data = new FormData();
                data.append('file', file);
                await API.post(`/lesson-notes/${savedNote.id}/attachments`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
        } catch (requestError) {
            setError(`Lesson note saved, but an attachment upload failed. Previously uploaded files were kept. ${requestError.response?.data?.message || requestError.message}`);
            setFilterDate(form.lessonDate);
            resetForm(form.lessonDate);
            try {
                const response = await API.get('/lesson-notes', { params: { date: form.lessonDate } });
                setNotes(response.data || []);
            } catch {
                setError(current => `${current} The saved note list could not be refreshed.`);
            } finally {
                setSaving(false);
            }
            return;
        }

        setFilterDate(form.lessonDate);
        setSuccess('Lesson note saved.');
        resetForm(form.lessonDate);
        try {
            const response = await API.get('/lesson-notes', { params: { date: form.lessonDate } });
            setNotes(response.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Lesson note saved, but the note list could not be refreshed.');
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
        setExistingAttachments(note.attachments || []);
        setSelectedFiles([]);
        setFilePickerKey(key => key + 1);
    };

    const deleteAttachment = async (noteId, attachment) => {
        try {
            await API.delete(`/lesson-notes/${noteId}/attachments/${attachment.id}`);
            setExistingAttachments(current => current.filter(item => item.id !== attachment.id));
            setNotes(current => current.map(note => note.id === noteId
                ? { ...note, attachments: note.attachments.filter(item => item.id !== attachment.id) }
                : note));
            setSuccess('Attachment deleted.');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to delete attachment.');
        }
    };

    const downloadAttachment = async (noteId, attachment) => {
        try {
            const response = await API.get(`/lesson-notes/${noteId}/attachments/${attachment.id}`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = attachment.fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to download attachment.');
        }
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
                <label className="small fw-semibold">Notes for date <input aria-label="Filter notes by date" type="date" className="form-control mt-1" value={filterDate} onChange={event => { setError(''); setFilterDate(event.target.value); }} /></label>
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
                        <RichTextEditor label="Learning objectives" value={form.learningObjectives}
                            onChange={learningObjectives => setForm(current => ({ ...current, learningObjectives }))} minHeight={90} />
                        <RichTextEditor label="Lesson activities" value={form.lessonActivities}
                            onChange={lessonActivities => setForm(current => ({ ...current, lessonActivities }))} minHeight={120} />
                        <RichTextEditor label="Teaching resources" value={form.teachingResources}
                            onChange={teachingResources => setForm(current => ({ ...current, teachingResources }))} minHeight={75} />
                        <RichTextEditor label="Homework" value={form.homework}
                            onChange={homework => setForm(current => ({ ...current, homework }))} minHeight={75} />
                        <div className="mb-3">
                            <label className="form-label small fw-semibold">Media and documents</label>
                            <input key={filePickerKey} type="file" multiple className="form-control"
                                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg,application/pdf"
                                onChange={event => setSelectedFiles(Array.from(event.target.files || []))} />
                            <small className="text-muted">Images up to 3 MiB, videos up to 5 MiB, PDFs up to 10 MiB each.</small>
                            {selectedFiles.length > 0 && <ul className="small mt-2 mb-0">
                                {selectedFiles.map(file => <li key={`${file.name}-${file.lastModified}`}>{file.name} ({formatFileSize(file.size)})</li>)}
                            </ul>}
                            {existingAttachments.length > 0 && <ul className="list-group list-group-flush mt-2">
                                {existingAttachments.map(attachment => <li key={attachment.id} className="list-group-item px-0 py-1 d-flex justify-content-between align-items-center small">
                                    <span className="text-break">{attachment.fileName} ({formatFileSize(attachment.fileSize)})</span>
                                    <button type="button" className="btn btn-sm btn-outline-danger ms-2"
                                        onClick={() => deleteAttachment(editingId, attachment)} aria-label={`Delete ${attachment.fileName}`}>
                                        <Trash2 size={14} />
                                    </button>
                                </li>)}
                            </ul>}
                        </div>
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
                            <div className="small"><strong>Objectives:</strong><div className="mb-2 text-break" dangerouslySetInnerHTML={{ __html: sanitizeRichText(note.learningObjectives) }} />
                                <strong>Activities:</strong><div className="mb-2 text-break" dangerouslySetInnerHTML={{ __html: sanitizeRichText(note.lessonActivities) }} />
                                {note.teachingResources && <><strong>Resources:</strong><div className="mb-2 text-break" dangerouslySetInnerHTML={{ __html: sanitizeRichText(note.teachingResources) }} /></>}
                                {note.homework && <><strong>Homework:</strong><div className="mb-0 text-break" dangerouslySetInnerHTML={{ __html: sanitizeRichText(note.homework) }} /></>}
                            </div>
                            {note.attachments?.length > 0 && <div className="border-top mt-3 pt-2">
                                <strong className="small"><Paperclip size={14} className="me-1" />Attachments</strong>
                                <ul className="list-unstyled mb-0 mt-1">
                                    {note.attachments.map(attachment => <li key={attachment.id} className="d-flex justify-content-between align-items-center gap-2 small py-1">
                                        <span className="text-break">{attachment.fileName} <span className="text-muted">({formatFileSize(attachment.fileSize)})</span></span>
                                        <button type="button" className="btn btn-sm btn-outline-primary flex-shrink-0"
                                            onClick={() => downloadAttachment(note.id, attachment)} aria-label={`Download ${attachment.fileName}`}>
                                            <Download size={14} />
                                        </button>
                                    </li>)}
                                </ul>
                            </div>}
                        </article>)}
                    </div>}
                </div>
            </div>
        </div>
    );
};

export default LessonNotes;
