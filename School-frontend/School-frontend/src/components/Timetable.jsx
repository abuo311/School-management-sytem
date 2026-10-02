import React, { useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import { CalendarDays, Loader2, Plus, Save, Trash2, X } from 'lucide-react';

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const emptyForm = { classId: '', subjectId: '', teacherId: '', dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '08:40', room: '' };

const Timetable = () => {
    const [entries, setEntries] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [schoolInfo, setSchoolInfo] = useState({ currentTerm: '', academicYear: '' });
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const isAdmin = sessionStorage.getItem('userRole') === 'ADMIN';

    useEffect(() => {
        loadPage();
    }, []);

    async function loadPage() {
        setLoading(true);
        setError('');
        try {
            const requests = [API.get('/timetable'), API.get('/settings')];
            if (isAdmin) requests.push(API.get('/classes'), API.get('/subjects'), API.get('/users'));
            const [timetableResponse, settingsResponse, classesResponse, subjectsResponse, usersResponse] = await Promise.all(requests);
            setEntries(timetableResponse.data || []);
            setSchoolInfo({
                currentTerm: settingsResponse.data?.currentTerm || '',
                academicYear: settingsResponse.data?.academicYear || ''
            });
            if (isAdmin) {
                setClasses(classesResponse.data || []);
                setSubjects(subjectsResponse.data || []);
                setTeachers((usersResponse.data || []).filter(user => user.role === 'TEACHER' && user.enabled));
            }
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to load timetable data.');
        } finally {
            setLoading(false);
        }
    }

    const entriesByDay = useMemo(() => Object.fromEntries(days.map(day => [
        day,
        entries.filter(entry => entry.dayOfWeek === day)
            .sort((first, second) => first.startTime.localeCompare(second.startTime))
    ])), [entries]);

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    const saveEntry = async event => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...form,
                classId: Number(form.classId),
                subjectId: Number(form.subjectId),
                teacherId: Number(form.teacherId)
            };
            if (editingId) await API.put(`/timetable/${editingId}`, payload);
            else await API.post('/timetable', payload);
            resetForm();
            await loadPage();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to save timetable entry.');
        } finally {
            setSaving(false);
        }
    };

    const editEntry = entry => {
        setEditingId(entry.id);
        setForm({
            classId: String(entry.classId),
            subjectId: String(entry.subjectId),
            teacherId: String(entry.teacherId),
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            room: entry.room || ''
        });
    };

    const deleteEntry = async entry => {
        if (!window.confirm(`Remove ${entry.subjectName} from ${entry.className}'s timetable?`)) return;
        setError('');
        try {
            await API.delete(`/timetable/${entry.id}`);
            setEntries(current => current.filter(item => item.id !== entry.id));
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to delete timetable entry.');
        }
    };

    return (
        <div className="container-fluid py-4 text-start">
            <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h3 className="fw-bold mb-1"><CalendarDays className="me-2 text-primary" size={24} />Timetable</h3>
                    <p className="text-muted small mb-0">{schoolInfo.currentTerm} · {schoolInfo.academicYear}{!isAdmin && ' · Your assigned lessons'}</p>
                </div>
                {isAdmin && <button type="button" className="btn btn-dark d-flex align-items-center gap-2" onClick={resetForm}>
                    <Plus size={17} /> Add lesson slot
                </button>}
            </header>

            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

            {isAdmin && <form className="bg-white border rounded p-3 mb-4" onSubmit={saveEntry}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0">{editingId ? 'Edit lesson slot' : 'New lesson slot'}</h6>
                    {editingId && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetForm}><X size={15} /> Cancel edit</button>}
                </div>
                <div className="row g-2 align-items-end">
                    <div className="col-sm-6 col-lg-2"><label className="form-label small fw-semibold">Day</label><select className="form-select" value={form.dayOfWeek} onChange={event => setForm({ ...form, dayOfWeek: event.target.value })}>{days.map(day => <option key={day} value={day}>{day[0] + day.slice(1).toLowerCase()}</option>)}</select></div>
                    <div className="col-sm-6 col-lg-2"><label className="form-label small fw-semibold">Class</label><select required className="form-select" value={form.classId} onChange={event => setForm({ ...form, classId: event.target.value })}><option value="">Select class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.className}</option>)}</select></div>
                    <div className="col-sm-6 col-lg-2"><label className="form-label small fw-semibold">Subject</label><select required className="form-select" value={form.subjectId} onChange={event => setForm({ ...form, subjectId: event.target.value })}><option value="">Select subject</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                    <div className="col-sm-6 col-lg-2"><label className="form-label small fw-semibold">Teacher</label><select required className="form-select" value={form.teacherId} onChange={event => setForm({ ...form, teacherId: event.target.value })}><option value="">Select teacher</option>{teachers.map(item => <option key={item.id} value={item.id}>{item.fullName || item.username}</option>)}</select></div>
                    <div className="col-6 col-lg-1"><label className="form-label small fw-semibold">From</label><input required type="time" className="form-control" value={form.startTime} onChange={event => setForm({ ...form, startTime: event.target.value })} /></div>
                    <div className="col-6 col-lg-1"><label className="form-label small fw-semibold">To</label><input required type="time" className="form-control" value={form.endTime} onChange={event => setForm({ ...form, endTime: event.target.value })} /></div>
                    <div className="col-sm-6 col-lg-1"><label className="form-label small fw-semibold">Room</label><input className="form-control" value={form.room} onChange={event => setForm({ ...form, room: event.target.value })} placeholder="Optional" /></div>
                    <div className="col-sm-6 col-lg-1 d-grid"><button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={17} className="animate-spin" /> : editingId ? <Save size={17} /> : <Plus size={17} />}</button></div>
                </div>
            </form>}

            {loading ? <div className="py-5 text-center text-muted"><Loader2 className="animate-spin me-2" />Loading timetable...</div> : (
                <div className="row g-3">
                    {days.map(day => <section key={day} className="col-12 col-md-6 col-xl-4">
                        <div className="h-100 bg-white border rounded">
                            <div className="d-flex justify-content-between align-items-center border-bottom px-3 py-2">
                                <h6 className="fw-bold mb-0">{day[0] + day.slice(1).toLowerCase()}</h6>
                                <span className="badge bg-light text-dark">{entriesByDay[day].length}</span>
                            </div>
                            <div className="p-2 d-grid gap-2">
                                {entriesByDay[day].length === 0 ? <div className="text-muted small p-3">No scheduled lessons</div> : entriesByDay[day].map(entry => <article key={entry.id} className="border-start border-3 border-primary bg-light px-3 py-2">
                                    <div className="d-flex justify-content-between gap-2">
                                        <strong>{entry.startTime}–{entry.endTime}</strong>
                                        {isAdmin && <div className="d-flex gap-1"><button type="button" className="btn btn-sm btn-link p-0" title="Edit slot" onClick={() => editEntry(entry)}><Save size={15} /></button><button type="button" className="btn btn-sm btn-link text-danger p-0" title="Delete slot" onClick={() => deleteEntry(entry)}><Trash2 size={15} /></button></div>}
                                    </div>
                                    <div className="fw-semibold">{entry.subjectName}</div>
                                    <div className="small text-muted">{entry.className} · {entry.teacherName}</div>
                                    {entry.room && <div className="small text-muted">Room {entry.room}</div>}
                                </article>)}
                            </div>
                        </div>
                    </section>)}
                </div>
            )}
        </div>
    );
};

export default Timetable;
