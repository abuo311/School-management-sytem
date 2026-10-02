import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as bootstrap from 'bootstrap'; 
import API from '../services/api';
import {
    CheckCircle, XCircle, Save, Calendar, Search,
    GraduationCap, ClipboardCheck, History,
    Loader2, Download
} from 'lucide-react';

const Attendance = () => {
    const [students, setStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [attendanceReasons, setAttendanceReasons] = useState({});
    const [history, setHistory] = useState([]);
    const [classCategories, setClassCategories] = useState(['All']);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState('mark');
    
    // NEW: State for School Details
    const [schoolInfo, setSchoolInfo] = useState({
        schoolName: 'EduManager School',
        motto: '',
        logoUrl: null
    });

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedGrade, setSelectedGrade] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const attendanceStatuses = [
        { value: 'PRESENT', label: 'Present' },
        { value: 'LATE', label: 'Late' },
        { value: 'ABSENT', label: 'Absent' },
        { value: 'SICK', label: 'Sick' },
        { value: 'STOPPED_SCHOOLING', label: 'Stopped Schooling' },
        { value: 'OTHER', label: 'Other' }
    ];

    useEffect(() => {
        fetchDynamicClasses();
        fetchSchoolSettings(); // Fetch settings on mount
    }, []);

    useEffect(() => {
        if (viewMode === 'mark') {
            fetchStudents();
        } else {
            fetchHistory();
        }
    }, [viewMode, selectedDate]);

    // NEW: Fetch School Settings
    const fetchSchoolSettings = async () => {
        try {
            const res = await API.get('/settings');
            if (res.data) {
                setSchoolInfo({
                    schoolName: res.data.schoolName || 'EduManager School',
                    motto: res.data.motto || '',
                    logoUrl: res.data.logoUrl || null
                });
            }
        } catch (err) {
            console.error("Error fetching school settings:", err);
        }
    };

    const fetchDynamicClasses = async () => {
        try {
            const res = await API.get('/classes');
            const names = res.data.map(c => typeof c === 'string' ? c : c.className);
            setClassCategories(['All', ...names]);
        } catch (err) { console.error("Error loading classes:", err); }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await API.get('/students');
            const data = res.data || [];
            setStudents(data);
            const initialMap = {};
            data.forEach(s => initialMap[s.id] = "PRESENT");
            setAttendanceMap(initialMap);
            setAttendanceReasons({});
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/attendance/date/${selectedDate}`);
            setHistory(res.data || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const updateAttendanceStatus = (id, status) => {
        setAttendanceMap(prev => ({ ...prev, [id]: status }));
    };

    const handleSubmit = async () => {
        const targetStudents = students.filter(s => selectedGrade === 'All' || s.gradeLevel === selectedGrade);
        if (targetStudents.length === 0) return alert("No students found.");

        setSubmitting(true);
        const payload = targetStudents.map(s => ({
            student: { id: s.id },
            status: attendanceMap[s.id] || "PRESENT",
            reason: attendanceReasons[s.id] || '',
            attendanceDate: selectedDate
        }));

        try {
            await API.post('/attendance/bulk', payload);
            const toastElement = document.getElementById('successToast');
            if (toastElement) {
                const toast = new bootstrap.Toast(toastElement);
                toast.show();
            }
            setViewMode('view');
        } catch (err) {
            alert("Failed to save data.");
        } finally {
            setSubmitting(false);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const dateStr = new Date(selectedDate).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        const currentData = viewMode === 'view'
            ? history.filter(h => selectedGrade === 'All' || h.student.gradeLevel === selectedGrade)
                .map(h => ({ name: `${h.student.firstName} ${h.student.lastName}`, class: h.student.gradeLevel, status: h.status, reason: h.reason || '' }))
            : filteredStudents.map(s => ({ name: `${s.firstName} ${s.lastName}`, class: s.gradeLevel, status: attendanceMap[s.id], reason: attendanceReasons[s.id] || '' }));

        if (currentData.length === 0) return alert("No data to export.");

        const total = currentData.length;
        const present = currentData.filter(d => d.status === 'PRESENT').length;
        const absent = currentData.filter(d => d.status === 'ABSENT').length;
        const late = currentData.filter(d => d.status === 'LATE').length;
        const other = total - present - absent - late;
        const rate = total ? ((present / total) * 100).toFixed(1) : '0.0';

        // --- HEADER SECTION ---
        doc.setFillColor(26, 26, 26);
        doc.rect(0, 0, 210, 45, 'F');
        
        // Add School Logo if exists
        if (schoolInfo.logoUrl) {
            try {
                doc.addImage(schoolInfo.logoUrl, 'JPEG', 14, 10, 25, 25);
            } catch (e) { console.error("Logo error", e); }
        }

        doc.setFontSize(18);
        doc.setTextColor(212, 175, 55); // Gold
        // DYNAMIC SCHOOL NAME
        doc.text(schoolInfo.schoolName.toUpperCase(), 105, 20, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        // DYNAMIC MOTTO
        if (schoolInfo.motto) {
            doc.text(schoolInfo.motto, 105, 26, { align: 'center' });
        }

        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(`ATTENDANCE REPORT • ${dateStr}`, 105, 35, { align: 'center' });

        // Metadata
        doc.setTextColor(40);
        doc.setFontSize(10);
        doc.text(`Class: ${selectedGrade}`, 14, 55);
        doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 61);

        autoTable(doc, {
            startY: 70,
            head: [['Student Name', 'Class', 'Status', 'Reason']],
            body: currentData.map(d => [d.name, d.class, d.status, d.reason]),
            headStyles: { fillColor: [26, 26, 26], textColor: [212, 175, 55], fontStyle: 'bold' },
            bodyStyles: { textColor: 50 },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 2) {
                    if (data.cell.raw === 'ABSENT') doc.setTextColor(200, 0, 0);
                    else doc.setTextColor(0, 150, 0);
                }
            }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.rect(14, finalY, 182, 20);
        doc.text(`Total: ${total} | Present: ${present} | Absent: ${absent} | Late: ${late} | Other: ${other} | Present rate: ${rate}%`, 105, finalY + 12, { align: 'center' });

        doc.save(`Attendance_${selectedGrade}_${selectedDate}.pdf`);
    };

    // ... (rest of filtering and helper logic remains the same)
    const filteredStudents = students.filter(s =>
        (selectedGrade === 'All' || s.gradeLevel === selectedGrade) &&
        (`${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groupedHistory = history.reduce((groups, item) => {
        const date = item.attendanceDate;
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
        return groups;
    }, {});

    return (
        <div className="container-fluid py-4 text-start">
             {/* Header with dynamic School Name */}
             <header className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold mb-0">{schoolInfo.schoolName}</h3>
                    <p className="text-muted small">Attendance Center</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-dark d-flex align-items-center gap-2 shadow-sm" onClick={generatePDF}>
                        <Download size={18} className="text-warning"/> Export PDF
                    </button>
                    <div className="btn-group bg-white p-1 rounded shadow-sm">
                        <button className={`btn btn-sm ${viewMode === 'mark' ? 'btn-primary' : 'btn-light'}`} onClick={() => setViewMode('mark')}>Mark</button>
                        <button className={`btn btn-sm ${viewMode === 'view' ? 'btn-primary' : 'btn-light'}`} onClick={() => setViewMode('view')}>Logs</button>
                    </div>
                </div>
            </header>

            {/* Success Toast */}
            <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
                <div id="successToast" className="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                    <div className="d-flex">
                        <div className="toast-body">Attendance records saved successfully!</div>
                        <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            </div>

            {/* Filter Card */}
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                <div className="row g-3">
                    <div className="col-md-3">
                        <label className="small fw-bold mb-2">Date</label>
                        <input type="date" className="form-control" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                        <label className="small fw-bold mb-2">Class</label>
                        <select className="form-select" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                            {classCategories.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="small fw-bold mb-2">Search</label>
                        <input type="text" className="form-control" placeholder="Search pupil..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    {viewMode === 'mark' && (
                        <div className="col-md-2 d-grid align-items-end">
                            <button className="btn btn-success fw-bold d-flex align-items-center justify-content-center gap-2"
                                    onClick={handleSubmit}
                                    disabled={submitting}>
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : "Save Data"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <table className="table table-hover align-middle mb-0">
                    <thead className="bg-dark text-warning small">
                        <tr>
                            <th className="px-4 py-3">Student Name</th>
                            <th>Class</th>
                            <th className="text-center">Status</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="text-center py-5"><Loader2 className="animate-spin text-primary mx-auto" /> Loading...</td></tr>
                        ) : viewMode === 'mark' ? (
                            filteredStudents.map(s => (
                                <tr key={s.id}>
                                    <td className="px-4 fw-bold">{s.firstName} {s.lastName}</td>
                                    <td>{s.gradeLevel}</td>
                                    <td className="text-center">
                                        <select className="form-select form-select-sm" value={attendanceMap[s.id] || 'PRESENT'} onChange={e => updateAttendanceStatus(s.id, e.target.value)}>
                                            {attendanceStatuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <input type="text" className="form-control form-control-sm" value={attendanceReasons[s.id] || ''} onChange={e => setAttendanceReasons(prev => ({ ...prev, [s.id]: e.target.value }))} placeholder="Optional reason" />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            Object.keys(groupedHistory).map(date => (
                                <React.Fragment key={date}>
                                    <tr className="bg-light"><td colSpan="4" className="px-4 fw-bold">{date}</td></tr>
                                    {groupedHistory[date].filter(h => selectedGrade === 'All' || h.student.gradeLevel === selectedGrade).map(h => (
                                        <tr key={h.id}>
                                            <td className="px-5">{h.student.firstName} {h.student.lastName}</td>
                                            <td>{h.student.gradeLevel}</td>
                                            <td className="text-center">
                                                <span className={`badge px-3 ${h.status === 'PRESENT' ? 'bg-success' : 'bg-danger'}`}>{h.status}</span>
                                            </td>
                                            <td className="small text-muted">{h.reason || '—'}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Attendance;