import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../services/api';
import { ClipboardCheck, Download, Loader2, Save } from 'lucide-react';

const todayLocal = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const groupNames = {
    TEACHING: 'Teaching Staff',
    NON_TEACHING: 'Non-Teaching Staff'
};

const StaffAttendance = () => {
    const [date, setDate] = useState(todayLocal);
    const [records, setRecords] = useState([]);
    const [schoolName, setSchoolName] = useState('School');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadAttendance();
    }, [date]);

    useEffect(() => {
        API.get('/settings')
            .then(response => setSchoolName(response.data?.schoolName || 'School'))
            .catch(() => {});
    }, []);

    async function loadAttendance() {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await API.get(`/staff-attendance/date/${date}`);
            setRecords(response.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to load staff attendance.');
        } finally {
            setLoading(false);
        }
    }

    const groupedRecords = useMemo(() => ({
        TEACHING: records.filter(record => record.staffGroup === 'TEACHING'),
        NON_TEACHING: records.filter(record => record.staffGroup === 'NON_TEACHING')
    }), [records]);

    const setRecord = (userId, field, value) => {
        setRecords(current => current.map(record => record.userId === userId
            ? { ...record, [field]: value }
            : record));
    };

    const saveAttendance = async () => {
        const marked = records.filter(record => record.status !== 'UNMARKED');
        if (marked.length === 0) {
            setError('Mark at least one staff member before saving.');
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const payload = marked.map(({ userId, status, reason }) => ({ userId, status, reason }));
            const response = await API.put(`/staff-attendance/date/${date}`, payload);
            setRecords(response.data || []);
            setSuccess(`Attendance saved for ${marked.length} staff member${marked.length === 1 ? '' : 's'}.`);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to save staff attendance.');
        } finally {
            setSaving(false);
        }
    };

    const exportReport = () => {
        if (!records.length) {
            setError('There are no staff accounts to include in the report.');
            return;
        }
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(schoolName, 14, 18);
        doc.setFontSize(11);
        doc.text(`Staff Attendance Report | ${date}`, 14, 27);

        let startY = 36;
        const summaryRows = [];
        for (const group of ['TEACHING', 'NON_TEACHING']) {
            const groupRecords = groupedRecords[group];
            if (!groupRecords.length) continue;
            const countStatus = status => groupRecords.filter(record => record.status === status).length;
            summaryRows.push([
                groupNames[group],
                groupRecords.length,
                countStatus('PRESENT'),
                countStatus('ABSENT'),
                countStatus('LATE'),
                countStatus('LEAVE'),
                countStatus('UNMARKED')
            ]);
            doc.setFontSize(12);
            doc.text(groupNames[group], 14, startY);
            autoTable(doc, {
                startY: startY + 4,
                head: [['Staff member', 'Username', 'Status', 'Reason']],
                body: groupRecords.map(record => [
                    record.fullName,
                    record.username,
                    record.status === 'UNMARKED' ? 'NOT MARKED' : record.status,
                    record.reason || ''
                ]),
                styles: { fontSize: 9 },
                headStyles: { fillColor: [26, 26, 26], textColor: [212, 175, 55] }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }
        if (summaryRows.length) {
            if (startY > 255) {
                doc.addPage();
                startY = 20;
            }
            doc.setFontSize(12);
            doc.text('Attendance Summary', 14, startY);
            autoTable(doc, {
                startY: startY + 4,
                head: [['Staff group', 'Total', 'Present', 'Absent', 'Late', 'Leave', 'Unmarked']],
                body: summaryRows,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [26, 26, 26], textColor: [212, 175, 55] }
            });
        }
        doc.save(`Staff_Attendance_${date}.pdf`);
    };

    return (
        <div className="container-fluid py-4 text-start">
            <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h3 className="fw-bold mb-1"><ClipboardCheck size={24} className="me-2 text-primary" />Staff Attendance</h3>
                    <p className="text-muted small mb-0">Teaching and non-teaching staff register</p>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    <input aria-label="Attendance date" type="date" className="form-control" value={date} onChange={event => setDate(event.target.value)} />
                    <button type="button" className="btn btn-outline-dark d-flex align-items-center gap-2" onClick={exportReport} disabled={records.length === 0}>
                        <Download size={17} /> Report
                    </button>
                    <button type="button" className="btn btn-dark d-flex align-items-center gap-2" onClick={saveAttendance} disabled={saving || loading || records.every(record => record.status === 'UNMARKED')}>
                        {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                        Save
                    </button>
                </div>
            </header>

            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
            {success && <div className="alert alert-success py-2" role="status">{success}</div>}

            {loading ? (
                <div className="py-5 text-center"><Loader2 className="animate-spin" /> Loading staff roster...</div>
            ) : records.length === 0 ? (
                <div className="py-5 text-center text-muted border rounded bg-white">No active staff accounts found.</div>
            ) : ['TEACHING', 'NON_TEACHING'].map(group => (
                <section key={group} className="mb-4">
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                        <h5 className="fw-bold mb-0">{groupNames[group]}</h5>
                        <span className="badge bg-light text-dark border">{groupedRecords[group].length} staff</span>
                    </div>
                    {groupedRecords[group].length === 0 ? (
                        <div className="text-muted small py-3">No active accounts in this group.</div>
                    ) : (
                        <div className="table-responsive bg-white border rounded">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr><th className="ps-3">Staff member</th><th>Role</th><th style={{ width: 170 }}>Status</th><th>Reason / note</th></tr>
                                </thead>
                                <tbody>
                                    {groupedRecords[group].map(record => (
                                        <tr key={record.userId}>
                                            <td className="ps-3 fw-semibold">{record.fullName}</td>
                                            <td>{record.role}</td>
                                            <td>
                                                <select className="form-select form-select-sm" value={record.status} onChange={event => setRecord(record.userId, 'status', event.target.value)}>
                                                    <option value="UNMARKED">Select status</option>
                                                    <option value="PRESENT">Present</option>
                                                    <option value="ABSENT">Absent</option>
                                                    <option value="LATE">Late</option>
                                                    <option value="LEAVE">On leave</option>
                                                </select>
                                            </td>
                                            <td><input className="form-control form-control-sm" value={record.reason || ''} onChange={event => setRecord(record.userId, 'reason', event.target.value)} placeholder="Optional" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
};

export default StaffAttendance;
