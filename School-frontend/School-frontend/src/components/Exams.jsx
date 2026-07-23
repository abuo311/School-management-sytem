import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import API from '../services/api';
import { Save, RefreshCcw, Trash2, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';

const Exams = () => {
    const [students, setStudents] = useState([]);
    const [dbSubjects, setDbSubjects] = useState([]);
    const [dbClasses, setDbClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [subject, setSubject] = useState('');
    const [term, setTerm] = useState('Term 1');
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ranking, setRanking] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([fetchStudents(), fetchSubjects(), fetchClasses()]);
        setLoading(false);
    };

    useEffect(() => {
        if (selectedClass && subject) fetchExistingScores();
    }, [selectedClass, subject, term]);

    const fetchStudents = async () => {
        try {
            const res = await API.get('/students');
            setStudents(res.data || []);
        } catch (err) {
            console.error("Students Error:", err);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await API.get('/subjects');
            const subjects = res.data || [];
            setDbSubjects(subjects);
            // Default to the first subject in the database if available
            if (subjects.length > 0) {
                setSubject(subjects[0].name);
            }
        } catch (err) {
            console.error("Subjects Fetch Error:", err);
            setDbSubjects([]);
        }
    };

    const fetchClasses = async () => {
        try {
            // Updated to fetch from settings/classes or appropriate endpoint
            const res = await API.get('/classes'); 
            setDbClasses(res.data || []);
            if (res.data.length > 0) {
                setSelectedClass(res.data[0].className);
            }
        } catch (err) {
            console.error("Error fetching classes:", err);
            // Fallback to student grade levels if specific class endpoint fails
            const uniqueClasses = [...new Set(students.map(s => s.gradeLevel))];
            setDbClasses(uniqueClasses.map(c => ({ className: c })));
        }
    };

    const fetchExistingScores = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/results/class/${selectedClass}/subject/${subject}/term/${term}`);
            const scoresMap = {};
            res.data.forEach(item => {
                scoresMap[item.student.id] = {
                    dbId: item.id,
                    classScore: item.classScore,
                    examScore: item.examScore,
                    totalScore: item.totalScore,
                    grade: item.grade,
                    saved: true
                };
            });
            setMarks(scoresMap);
        } catch (err) {
            console.error("Score Fetch Error:", err);
            setMarks({});
        } finally { setLoading(false); }
    };

    const handleCalculateRanks = async () => {
        if (!selectedClass) return alert("Please select a class first");
        const confirmMsg = `Calculate positions for all students in ${selectedClass}?`;
        if (window.confirm(confirmMsg)) {
            setRanking(true);
            try {
                await API.post(`/results/calculate-ranks/${selectedClass}/${term}`);
                showToast("Class rankings updated successfully!");
                fetchExistingScores();
            } catch (err) {
                alert("Failed to calculate rankings.");
            } finally { setRanking(false); }
        }
    };

    const calculateGrade = (total) => {
        if (total >= 80) return "1";
        if (total >= 70) return "2";
        if (total >= 65) return "3";
        if (total >= 60) return "4";
        if (total >= 55) return "5";
        if (total >= 50) return "6";
        if (total >= 45) return "7";
        if (total >= 40) return "8";
        return "9";
    };

    const handleScoreChange = (studentId, field, value) => {
        const numValue = value === '' ? '' : parseFloat(value);
        if (numValue !== '') {
            if (field === 'classScore' && numValue > 30) return;
            if (field === 'examScore' && numValue > 70) return;
            if (numValue < 0) return;
        }
        setMarks(prev => {
            const current = prev[studentId] || { classScore: 0, examScore: 0 };
            const updated = { ...current, [field]: numValue, saved: false };
            const cScore = parseFloat(updated.classScore) || 0;
            const eScore = parseFloat(updated.examScore) || 0;
            const total = cScore + eScore;
            updated.totalScore = total;
            updated.grade = calculateGrade(total);
            return { ...prev, [studentId]: updated };
        });
    };

    const saveExamResults = async () => {
        const payload = students
            .filter(s => s.gradeLevel === selectedClass && marks[s.id] && !marks[s.id].saved)
            .map(s => ({
                id: marks[s.id].dbId || null,
                student: { id: s.id },
                subject: subject, // Uses the state synced with DB
                term: term,
                academicYear: '2025/2026',
                classScore: parseFloat(marks[s.id].classScore) || 0,
                examScore: parseFloat(marks[s.id].examScore) || 0,
                totalScore: marks[s.id].totalScore,
                grade: marks[s.id].grade
            }));

        if (payload.length === 0) return alert("No valid changes to save.");

        setSaving(true);
        try {
            await API.post('/results/bulk', payload);
            showToast(`Exam results for ${subject} saved!`);
            fetchExistingScores();
        } catch (err) {
            alert("Save failed.");
        } finally { setSaving(false); }
    };

    const showToast = (message) => {
        const toastElement = document.getElementById('successToast');
        const toastBody = toastElement.querySelector('.toast-body');
        toastBody.innerText = message;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    };

    const deleteScore = async (dbId) => {
        if (!dbId || !window.confirm("Delete this record permanently?")) return;
        try {
            await API.delete(`/results/${dbId}`);
            fetchExistingScores();
        } catch (err) { console.error("Delete Error:", err); }
    };

    const filteredStudents = students.filter(s => s.gradeLevel === selectedClass);

    return (
        <div className="container-fluid py-4 bg-light min-vh-100 text-start">
            {/* Success Toast */}
            <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
                <div id="successToast" className="toast align-items-center text-white bg-success border-0" role="alert">
                    <div className="d-flex">
                        <div className="toast-body">Success!</div>
                        <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm p-4 mb-4 bg-white rounded-4">
                <div className="row g-3 align-items-end">
                    <div className="col-md-3">
                        <label className="small fw-bold text-muted mb-2 text-uppercase">Class</label>
                        <select className="form-select border-0 bg-light fw-bold" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            <option value="">-- Select Class --</option>
                            {dbClasses.map(c => (
                                <option key={c.id || c.className} value={c.className}>{c.className}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="small fw-bold text-muted mb-2 text-uppercase">Subject</label>
                        <select className="form-select border-0 bg-light fw-bold" value={subject} onChange={(e) => setSubject(e.target.value)}>
                            <option value="">-- Select Subject --</option>
                            {dbSubjects.map(sub => (
                                <option key={sub.id} value={sub.name}>{sub.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="small fw-bold text-muted mb-2 text-uppercase">Term</label>
                        <select className="form-select border-0 bg-light fw-bold" value={term} onChange={(e) => setTerm(e.target.value)}>
                            <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                        </select>
                    </div>
                    <div className="col-md-4 d-flex gap-2">
                        <button className="btn btn-primary flex-grow-1 fw-bold py-2 d-flex align-items-center justify-content-center gap-2"
                                onClick={saveExamResults} disabled={saving || !selectedClass || !subject}>
                            {saving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                            Save
                        </button>
                        <button className="btn btn-dark flex-grow-1 fw-bold py-2 d-flex align-items-center justify-content-center gap-2"
                                onClick={handleCalculateRanks} disabled={ranking || !selectedClass}>
                            {ranking ? <Loader2 size={18} className="animate-spin"/> : <TrendingUp size={18}/>}
                            Rank
                        </button>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <table className="table table-hover mb-0 align-middle">
                    <thead className="bg-dark text-white">
                        <tr className="small text-uppercase">
                            <th className="ps-4 py-3">Student Name</th>
                            <th className="text-center">Class (30)</th>
                            <th className="text-center">Exam (70)</th>
                            <th className="text-center">Total</th>
                            <th className="text-center">Grade</th>
                            <th className="text-center">Status</th>
                            <th className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="text-center py-5"><Loader2 className="animate-spin mx-auto text-primary" size={30}/></td></tr>
                        ) : filteredStudents.length > 0 ? (
                            filteredStudents.map(student => (
                                <tr key={student.id}>
                                    <td className="ps-4 fw-bold">{student.firstName} {student.lastName}</td>
                                    <td>
                                        <input type="number" className="form-control form-control-sm text-center border-0 bg-light mx-auto" style={{maxWidth: '70px'}}
                                               value={marks[student.id]?.classScore || ''}
                                               onChange={(e) => handleScoreChange(student.id, 'classScore', e.target.value)} />
                                    </td>
                                    <td>
                                        <input type="number" className="form-control form-control-sm text-center border-0 bg-light mx-auto" style={{maxWidth: '70px'}}
                                               value={marks[student.id]?.examScore || ''}
                                               onChange={(e) => handleScoreChange(student.id, 'examScore', e.target.value)} />
                                    </td>
                                    <td className="text-center fw-bold text-primary">{marks[student.id]?.totalScore || 0}</td>
                                    <td className="text-center">
                                        <span className={`badge ${marks[student.id]?.grade === '9' ? 'bg-danger' : 'bg-success'}`}>
                                            Grade {marks[student.id]?.grade || '-'}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        {marks[student.id]?.saved ? <CheckCircle className="text-success mx-auto" size={18}/> : <span className="badge bg-warning text-dark">PENDING</span>}
                                    </td>
                                    <td className="text-center">
                                        <button className="btn btn-link text-danger p-0" onClick={() => deleteScore(marks[student.id]?.dbId)} disabled={!marks[student.id]?.dbId}>
                                            <Trash2 size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="7" className="text-center py-5 text-muted">Select a class and subject to begin.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Exams;