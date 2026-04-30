import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import { Printer, Download, Mail, MessageSquare, Loader2 } from 'lucide-react';
import API from '../services/api.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReportCard = () => {
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [term, setTerm] = useState('Term 1');
    const [reports, setReports] = useState([]);
    const [settings, setSettings] = useState({ schoolName: 'EDUMANAGER', formMasters: [] });
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const showToast = (message, type = 'success') => {
        const toastEl = document.getElementById('reportToast');
        if (!toastEl) return;
        const toastBody = toastEl.querySelector('.toast-body');
        toastEl.className = `toast align-items-center text-white border-0 bg-${type === 'success' ? 'success' : 'danger'}`;
        toastBody.innerText = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    };

    const getOrdinal = (n) => {
        if (!n) return 'N/A';
        const s = ["th", "st", "nd", "rd"], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await API.get('/settings');
                setSettings({
                    ...res.data,
                    schoolName: res.data?.schoolName || 'EDUMANAGER',
                    formMasters: res.data?.formMasters || [] 
                });
            } catch (err) { console.error("Error loading settings:", err); }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await API.get('/classes');
                if (res.data) setClasses(res.data);
            } catch (err) { console.error("Error fetching classes:", err); }
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        setStudents([]);
        setSelectedStudentId('');
        if (!selectedClass) return;
        const fetchStudents = async () => {
            try {
                const res = await API.get(`/students/class/${encodeURIComponent(selectedClass)}`);
                setStudents(Array.isArray(res.data) ? res.data : []);
            } catch (err) { showToast("Failed to load student list", "danger"); }
        };
        fetchStudents();
    }, [selectedClass]);

    const groupResultsByStudent = (data) => {
        if (!data || !Array.isArray(data)) return [];
        const currentClassObj = classes.find(c => c.className === selectedClass);
        const assignedMasterName = currentClassObj?.formMasterName || null;

        const groupedMap = data.reduce((acc, curr) => {
            const studentId = curr.student.id;
            if (!acc[studentId]) {
                acc[studentId] = {
                    studentId: studentId,
                    studentName: `${curr.student.firstName} ${curr.student.lastName}`,
                    parentPhone: curr.student.parentContact || curr.student.parentPhone, 
                    parentEmail: curr.student.parentEmail,
                    academicYear: curr.academicYear,
                    formMasterName: assignedMasterName,
                    subjects: [],
                    totalScore: 0,
                };
            }
            acc[studentId].subjects.push({
                subjectName: curr.subject,
                score: curr.totalScore,
                grade: curr.grade,
                remarks: curr.remarks || 'Satisfactory'
            });
            acc[studentId].totalScore += curr.totalScore;
            return acc;
        }, {});

        const studentList = Object.values(groupedMap).sort((a, b) => b.totalScore - a.totalScore);
        const classSize = studentList.length;
        let currentPosition = 0;
        let lastScore = -1;
        let studentsProcessed = 0;

        return studentList.map((report) => {
            studentsProcessed++;
            if (report.totalScore !== lastScore) currentPosition = studentsProcessed;
            lastScore = report.totalScore;
            return { ...report, position: currentPosition, classSize: classSize };
        });
    };

    const getMasterSignature = (name) => {
        if (!name || !settings.formMasters) return null;
        const master = settings.formMasters.find(m => m.name === name);
        return master ? master.signature : null;
    };

    const fetchBulkReports = async () => {
        if (!selectedClass) return showToast("Please select a class", "danger");
        setLoading(true);
        try {
            const endpoint = selectedStudentId
                ? `/results/details/student/${selectedStudentId}/term/${term}`
                : `/results/details/class/${encodeURIComponent(selectedClass)}/term/${term}`;
            const res = await API.get(endpoint);
            const grouped = groupResultsByStudent(res.data);
            setReports(grouped);
            if (grouped.length > 0) showToast(`${grouped.length} reports loaded!`);
            else showToast("No records found", "danger");
        } catch (err) { 
            showToast("Failed to load reports", "danger"); 
        } finally { 
            setLoading(false); 
        }
    };

    const generatePdfBlob = async (studentId) => {
        const element = document.getElementById(`report-page-${studentId}`);
        if (!element) throw new Error("Report element not found");
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        return pdf.output('blob');
    };

    const handleSendIndividual = async (report, method) => {
        if (method === 'whatsapp') {
            const phone = report.parentPhone;
            if (!phone) return showToast("No phone number found", "danger");
            const message = `Hello, this is ${settings.schoolName}. The ${term} report for ${report.studentName} is ready. Total Score: ${report.totalScore}, Position: ${report.position}/${report.classSize}.`;
            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            if (!report.parentEmail) return showToast("No email found", "danger");
            setActionLoading(true);
            try {
                const pdfBlob = await generatePdfBlob(report.studentId);
                const formData = new FormData();
                formData.append('file', pdfBlob, `Report_${report.studentId}.pdf`);

                await API.post(`/notifications/email/report/student/${report.studentId}/term/${encodeURIComponent(term)}/attachment`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showToast(`Email sent to ${report.parentEmail}`);
            } catch (err) { 
                console.error(err);
                showToast("Failed to send email attachment", "danger"); 
            } finally { 
                setActionLoading(false); 
            }
        }
    };

    const handleSendBulk = async (method) => {
        if (reports.length === 0) return;
        if (method !== 'email') return showToast("Bulk WhatsApp not supported", "warning");
        if (!window.confirm(`Send ${reports.length} emails? This may take a moment.`)) return;
        
        setActionLoading(true);
        let successCount = 0;
        
        try {
            for (const report of reports) {
                if (!report.parentEmail) continue;
                try {
                    const pdfBlob = await generatePdfBlob(report.studentId);
                    const formData = new FormData();
                    formData.append('file', pdfBlob, 'report.pdf');
                    await API.post(`/notifications/email/report/student/${report.studentId}/term/${encodeURIComponent(term)}/attachment`, formData);
                    successCount++;
                } catch (e) {
                    console.error(`Failed to send for ${report.studentName}`);
                }
            }
            showToast(`Bulk complete: ${successCount} emails sent.`);
        } catch (err) { 
            showToast("Bulk action encountered errors", "danger"); 
        } finally { 
            setActionLoading(false); 
        }
    };

    const downloadPDF = async () => {
        const reportElements = document.querySelectorAll('.report-page');
        if (reportElements.length === 0) return;
        setActionLoading(true);
        const pdf = new jsPDF('p', 'mm', 'a4');
        try {
            for (let i = 0; i < reportElements.length; i++) {
                const element = reportElements[i];
                const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL('image/png');
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            }
            pdf.save(`${selectedClass}_Reports.pdf`);
            showToast("PDF downloaded!");
        } catch (err) { 
            showToast("Error generating PDF", "danger"); 
        } finally { 
            setActionLoading(false); 
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100 text-start">
            <style>
                {`
                    .report-page { display: flex; flex-direction: column; width: 210mm; height: 297mm; background: white; margin: 0 auto; border: 1px solid #ddd; overflow: hidden; position: relative; }
                    @media print {
                        body * { visibility: hidden; }
                        #report-container, #report-container * { visibility: visible; }
                        #report-container { position: absolute; left: 0; top: 0; width: 100% !important; }
                        .no-print { display: none !important; }
                        .report-page { height: 296mm !important; page-break-after: always !important; border: none !important; margin: 0 !important; }
                    }
                    .fw-black { font-weight: 900; }
                    .report-footer-actions { border-top: 1px solid #eee; padding: 15px; background: #f8f9fa; }
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}
            </style>

            <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
                <div id="reportToast" className="toast align-items-center border-0" role="alert">
                    <div className="d-flex">
                        <div className="toast-body fw-bold"></div>
                        <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            </div>

            {/* Controls Section */}
            <div className="card border-0 shadow-sm p-4 mb-4 no-print rounded-4 mx-auto" style={{maxWidth: '1200px'}}>
                <div className="row g-3 align-items-end">
                    <div className="col-md-2">
                        <label className="form-label small fw-bold">CLASS</label>
                        <select className="form-select" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            <option value="">Choose...</option>
                            {classes.map(c => <option key={c.id} value={c.className}>{c.className}</option>)}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label small fw-bold">TERM</label>
                        <select className="form-select" value={term} onChange={(e) => setTerm(e.target.value)}>
                            <option value="Term 1">Term 1</option>
                            <option value="Term 2">Term 2</option>
                            <option value="Term 3">Term 3</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">STUDENT</label>
                        <select className="form-select" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} disabled={!selectedClass}>
                            <option value="">Entire Class</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                        </select>
                    </div>
                    <div className="col-md-5 d-flex gap-2">
                        <button className="btn btn-dark fw-bold flex-grow-1" onClick={fetchBulkReports} disabled={loading}>
                            {loading ? <Loader2 className="spin" size={18} /> : "LOAD"}
                        </button>
                        <div className="btn-group">
                            <button className="btn btn-outline-dark" onClick={() => window.print()} disabled={reports.length === 0}><Printer size={18}/></button>
                            <button className="btn btn-outline-dark" onClick={downloadPDF} disabled={reports.length === 0 || actionLoading}><Download size={18}/></button>
                        </div>
                        <button className="btn btn-primary fw-bold" onClick={() => handleSendBulk('email')} disabled={reports.length === 0 || actionLoading}>
                            {actionLoading ? <Loader2 className="spin me-1" size={18} /> : <Mail size={18} className="me-1"/>} 
                            BULK EMAIL
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Display Section */}
            <div id="report-container" className="mx-auto" style={{maxWidth: '850px'}}>
                {reports.map((report, index) => (
                    <div key={index} id={`report-page-${report.studentId}`} className="report-page mb-5 shadow">
                        
                        {/* Header */}
                        <div className="bg-black text-white p-4 text-center border-bottom border-warning border-5">
                            <div className="d-flex align-items-center justify-content-center gap-4">
                                {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" style={{ height: '80px' }} />}
                                <div className="text-start">
                                    <h2 className="fw-black text-uppercase m-0 text-warning">{settings.schoolName}</h2>
                                    <p className="mb-0 small fw-bold text-white-50">{settings?.motto}</p>
                                    <p className="small mb-0 text-white-50">{settings?.address} | {settings?.phone}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 flex-grow-1">
                            {/* Student Info */}
                            <div className="row mb-4 bg-light p-3 rounded-3 mx-0 border-start border-warning border-5">
                                <div className="col-7">
                                    <small className="text-muted d-block text-uppercase fw-bold">Pupil Name</small>
                                    <h5 className="mb-0 text-uppercase fw-black">{report.studentName}</h5>
                                </div>
                                <div className="col-5 text-end">
                                    <span className="badge bg-black text-warning px-3 py-2 mb-2">{term.toUpperCase()}</span>
                                    <p className="mb-0 small fw-bold text-muted">Class: {selectedClass} | {report.academicYear}</p>
                                </div>
                            </div>

                            {/* Key Stats */}
                            <div className="row g-3 mb-4 text-center">
                                {[
                                    { label: 'Total Score', value: report.totalScore },
                                    { label: 'Average', value: report.subjects.length > 0 ? `${(report.totalScore / report.subjects.length).toFixed(1)}%` : '0%' },
                                    { label: 'Position', value: getOrdinal(report.position), highlight: true },
                                    { label: 'Class Size', value: report.classSize }
                                ].map((stat, i) => (
                                    <div className="col-3" key={i}>
                                        <div className={`p-2 border rounded shadow-sm ${stat.highlight ? 'border-warning bg-warning bg-opacity-10' : 'bg-white'}`}>
                                            <small className="text-muted d-block fw-bold" style={{fontSize: '0.65rem'}}>{stat.label}</small>
                                            <h5 className="fw-black mb-0">{stat.value}</h5>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Subjects Table */}
                            <table className="table table-bordered border-dark align-middle">
                                <thead className="bg-black text-warning">
                                    <tr><th>SUBJECT</th><th className="text-center">SCORE</th><th className="text-center">GRADE</th><th>REMARKS</th></tr>
                                </thead>
                                <tbody>
                                    {report.subjects.map((sub, i) => (
                                        <tr key={i}>
                                            <td className="fw-bold px-3">{sub.subjectName}</td>
                                            <td className="text-center fw-bold">{sub.score}</td>
                                            <td className="text-center"><span className="badge bg-light text-dark border border-dark">{sub.grade}</span></td>
                                            <td className="small italic text-muted">{sub.remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Signatures */}
                            <div className="mt-auto pt-5">
                                <div className="row align-items-end text-center">
                                    <div className="col-4">
                                        <div style={{ height: '50px' }} className="d-flex align-items-end justify-content-center mb-1">
                                            {settings?.headTeacherSign && <img src={settings.headTeacherSign} alt="Sign" style={{ maxHeight: '50px' }} />}
                                        </div>
                                        <div className="border-top border-dark mx-2 pt-1">
                                            <p className="small mb-0 fw-bold">HEADMASTER</p>
                                            <small className="text-muted" style={{fontSize: '10px'}}>{settings?.headMasterName || 'Signatory'}</small>
                                        </div>
                                    </div>
                                    <div className="col-4">
                                        <div style={{ height: '80px' }} className="d-flex align-items-center justify-content-center">
                                            {settings?.schoolStamp && <img src={settings.schoolStamp} alt="Stamp" style={{ maxHeight: '80px', opacity: '0.5' }} />}
                                        </div>
                                        <small className="text-muted fw-bold" style={{fontSize: '9px'}}>OFFICIAL STAMP</small>
                                    </div>
                                    <div className="col-4">
                                        <div style={{ height: '50px' }} className="d-flex align-items-end justify-content-center mb-1">
                                            {getMasterSignature(report.formMasterName) && (
                                                <img src={getMasterSignature(report.formMasterName)} alt="Sign" style={{ maxHeight: '50px' }} />
                                            )}
                                        </div>
                                        <div className="border-top border-dark mx-2 pt-1">
                                            <p className="small mb-0 fw-bold">FORM MASTER</p>
                                            <small className="text-muted" style={{fontSize: '10px'}}>{report.formMasterName || '________________'}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Moved Actions to Footer of Each Card */}
                        <div className="report-footer-actions no-print d-flex justify-content-center gap-3">
                            <button className="btn btn-success fw-bold px-4 rounded-pill d-flex align-items-center gap-2" onClick={() => handleSendIndividual(report, 'whatsapp')}>
                                <MessageSquare size={18}/> WhatsApp Parent
                            </button>
                            <button className="btn btn-primary fw-bold px-4 rounded-pill d-flex align-items-center gap-2" onClick={() => handleSendIndividual(report, 'email')} disabled={actionLoading}>
                                {actionLoading ? <Loader2 className="spin" size={18} /> : <Mail size={18}/>} Email Parent
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReportCard;