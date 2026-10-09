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

    const formatCurrency = (value) => {
        const amount = Number(value || 0);
        return `GHS ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const addCanvasToA4 = (pdf, canvas) => {
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 8;
        const scale = Math.min(
            (pageWidth - margin * 2) / canvas.width,
            (pageHeight - margin * 2) / canvas.height
        );
        const width = canvas.width * scale;
        const height = canvas.height * scale;
        pdf.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            (pageWidth - width) / 2,
            (pageHeight - height) / 2,
            width,
            height
        );
    };

    const loadFeeSummary = async (report) => {
        try {
            const res = await API.get(`/fees/student/${report.studentId}`);
            const history = Array.isArray(res.data) ? res.data : [];
            const latestByCycle = new Map();

            history.forEach((item) => {
                const cycleKey = `${item.term || 'default'}|${item.academicYear || 'default'}`;
                const current = latestByCycle.get(cycleKey);
                if (!current || (item.id && current.id && item.id > current.id) || (item.datePaid && current.datePaid && item.datePaid > current.datePaid)) {
                    latestByCycle.set(cycleKey, item);
                }
            });

            const feesOwed = Array.from(latestByCycle.values()).reduce((sum, item) => {
                const balance = Number(item.balance || 0);
                return sum + (Number.isFinite(balance) ? balance : 0);
            }, 0);

            return { ...report, feesOwed, nextTermFees: Number(settings.nextTermFees || 0) };
        } catch (err) {
            return { ...report, feesOwed: 0, nextTermFees: Number(settings.nextTermFees || 0) };
        }
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
            const enriched = await Promise.all(grouped.map(loadFeeSummary));
            setReports(enriched);
            if (enriched.length > 0) showToast(`${enriched.length} reports loaded!`);
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
        const pdf = new jsPDF('p', 'mm', 'a4');
        addCanvasToA4(pdf, canvas);
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
                if (i > 0) pdf.addPage();
                addCanvasToA4(pdf, canvas);
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
                    @page { size: A4 portrait; margin: 0; }
                    .report-wrapper {
                        display: flex;
                        justify-content: center;
                        max-width: 100%;
                        overflow-x: auto;
                        margin: 0 auto 2rem;
                        box-shadow: none !important;
                    }
                    .report-page {
                        display: flex;
                        flex-direction: column;
                        width: 210mm;
                        min-height: 297mm;
                        height: auto;
                        max-width: none;
                        flex-shrink: 0;
                        padding: 8mm;
                        box-sizing: border-box;
                        position: relative;
                        overflow: visible;
                        background: #fff;
                        border: 0;
                        color: #000;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 9pt;
                        line-height: 1.2;
                    }
                    .report-page *,
                    .report-page *::before,
                    .report-page *::after {
                        color: #000 !important;
                        background-color: transparent !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        text-shadow: none !important;
                    }
                    .report-page { --report-accent: var(--theme-accent, #1d4ed8); }
                    .report-page .report-header {
                        border: 0 !important;
                        border-bottom: 1px solid var(--report-accent) !important;
                        padding: 0 0 3mm !important;
                    }
                    .report-page .report-header h2 { font-size: 16pt !important; font-weight: 700 !important; }
                    .report-page .report-header p { font-size: 8pt !important; }
                    .report-page .report-accent-text { color: var(--report-accent) !important; }
                    .report-page .report-accent-border { border-color: var(--report-accent) !important; }
                    .report-page .report-accent-outline { border: 0.3mm solid var(--report-accent) !important; }
                    .report-page .p-2 { padding: 2mm !important; }
                    .report-page .table {
                        width: 100%;
                        margin-bottom: 2mm;
                        border-collapse: collapse;
                        font-size: 8pt !important;
                    }
                    .report-page .table th,
                    .report-page .table td {
                        padding: 1mm 1.5mm !important;
                        border: 0 !important;
                        border-bottom: 0.2mm solid #777 !important;
                    }
                    .report-page .table thead th {
                        color: var(--report-accent) !important;
                        border-bottom: 0.5mm solid var(--report-accent) !important;
                    }
                    .report-page .badge { padding: 0 !important; font-weight: 700 !important; }
                    .report-page .fw-black { font-weight: 700 !important; }
                    .report-page .text-center { text-align: center !important; }
                    .report-page .text-end { text-align: right !important; }
                    .report-page .no-print { display: none !important; }
                    .report-page .border,
                    .report-page .border-top,
                    .report-page .border-bottom,
                    .report-page .border-start {
                        border-color: #000 !important;
                    }
                    .report-page .border-start.report-accent-border,
                    .report-page .border.report-accent-border {
                        border-color: var(--report-accent) !important;
                    }
                    .report-page img { max-width: 35mm; object-fit: contain; }
                    @media print {
                        body * { visibility: hidden; }
                        #report-container, #report-container * { visibility: visible; }
                        #report-container { position: absolute; inset: 0; width: 100% !important; }
                        .no-print { display: none !important; }
                        .report-wrapper {
                            display: block;
                            width: 210mm;
                            margin: 0;
                            page-break-after: always;
                            break-after: page;
                        }
                        .report-wrapper:last-child {
                            page-break-after: auto;
                            break-after: auto;
                        }
                        .report-page {
                            width: 210mm !important;
                            min-height: 297mm !important;
                            height: auto !important;
                            max-width: none !important;
                            padding: 8mm !important;
                            margin: 0 !important;
                            overflow: visible !important;
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                    }
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
                    <div className="col-12 col-sm-6 col-lg-2">
                        <label className="form-label small fw-bold">CLASS</label>
                        <select className="form-select" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            <option value="">Choose...</option>
                            {classes.map(c => <option key={c.id} value={c.className}>{c.className}</option>)}
                        </select>
                    </div>
                    <div className="col-12 col-sm-6 col-lg-2">
                        <label className="form-label small fw-bold">TERM</label>
                        <select className="form-select" value={term} onChange={(e) => setTerm(e.target.value)}>
                            <option value="Term 1">Term 1</option>
                            <option value="Term 2">Term 2</option>
                            <option value="Term 3">Term 3</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-6 col-lg-2">
                        <label className="form-label small fw-bold">STUDENT</label>
                        <select className="form-select" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} disabled={!selectedClass}>
                            <option value="">Entire Class</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                        </select>
                    </div>
                    <div className="col-12 col-md-12 col-lg-6 d-flex flex-wrap gap-2">
                        <button className="btn btn-dark fw-bold flex-grow-1" onClick={fetchBulkReports} disabled={loading}>
                            {loading ? <Loader2 className="spin" size={18} /> : "LOAD"}
                        </button>
                        <div className="btn-group flex-grow-0">
                            <button className="btn btn-outline-dark" onClick={() => window.print()} disabled={reports.length === 0}><Printer size={18}/></button>
                            <button className="btn btn-outline-dark" onClick={downloadPDF} disabled={reports.length === 0 || actionLoading}><Download size={18}/></button>
                        </div>
                        <button className="btn btn-primary fw-bold flex-grow-1" onClick={() => handleSendBulk('email')} disabled={reports.length === 0 || actionLoading}>
                            {actionLoading ? <Loader2 className="spin me-1" size={18} /> : <Mail size={18} className="me-1"/>} 
                            BULK EMAIL
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Display Section */}
            <div id="report-container" className="mx-auto" >
                {reports.map((report, index) => (
                    <div key={index} className="report-wrapper">
                        <div
                            id={`report-page-${report.studentId}`}
                            className="report-page"
                        >
                            
                            {/* Header */}
                            <div className="p-2 text-center report-header">
                                <div className="d-flex align-items-center justify-content-center gap-2">
                                    {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" style={{ height: '50px' }} />}
                                    <div className="text-start">
                                        <h2 className="fw-300 text-uppercase m-0 text-lg report-accent-text" style={{ fontSize: '1.3rem' }}>{settings.schoolName}</h2>
                                        <p className="mb-0 x-small fw-bold text-white" style={{ fontSize: '0.7rem' }}>{settings?.motto}</p>
                                        <p className="x-small mb-0 text-white" style={{ fontSize: '0.65rem' }}>{settings?.address} | {settings?.phone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-2 flex-grow-1 d-flex flex-column justify-content-between" style={{ fontSize: '0.9rem' }}>
                                {/* Student Info */}
                                <div className="row mb-2 bg-light p-2 rounded-2 mx-0 border-start border-dark border-5 report-accent-border align-items-center">
                                    <div className="col-7">
                                        <small className="text-dark d-block text-uppercase fw-bold report-accent-text" style={{ fontSize: '0.6rem' }}>Pupil Name</small>
                                        <h5 className="mb-0 text-uppercase fw-black" style={{ fontSize: '0.9rem', color: '#1a1a1a' }}>{report.studentName}</h5>
                                    </div>
                                    <div className="col-5 text-end">
                                        <span className="badge bg-dark text-white px-2 py-1 mb-1 report-accent-text report-accent-outline" style={{ fontSize: '0.6rem' }}>{term.toUpperCase()}</span>
                                        <p className="mb-0 x-small fw-bold text-dark" style={{ fontSize: '0.65rem' }}>Class: {selectedClass} | {report.academicYear}</p>
                                    </div>
                                </div>

                                {/* Key Stats */}
                                <div className="row g-2 mb-2 text-center">
                                    {[
                                        { label: 'Total Score', value: report.totalScore },
                                        { label: 'Average', value: report.subjects.length > 0 ? `${(report.totalScore / report.subjects.length).toFixed(1)}%` : '0%' },
                                        { label: 'Position', value: getOrdinal(report.position), highlight: true },
                                        { label: 'Class Size', value: report.classSize }
                                    ].map((stat, i) => (
                                        <div className="col-3" key={i}>
                                            <div className={`p-1 border rounded shadow-sm ${stat.highlight ? 'border-dark bg-light report-accent-border' : 'bg-white'}`}>
                                                <small className="text-dark d-block fw-bold" style={{fontSize: '0.55rem', color: '#333'}}>{stat.label}</small>
                                                <h5 className="fw-black mb-0 text-dark" style={{ fontSize: '0.85rem', color: '#1a1a1a' }}>{stat.value}</h5>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Subjects Table */}
                                <div className="table-responsive">
                                    <table className="table table-bordered border-dark align-middle mb-2" style={{ fontSize: '0.75rem', marginBottom: '0' }}>
                                        <thead className="bg-dark text-white">
                                            <tr>
                                                <th className="px-2 py-1" style={{ fontSize: '0.7rem' }}>SUBJECT</th>
                                                <th className="text-center py-1" style={{ width: '80px', fontSize: '0.7rem' }}>SCORE</th>
                                                <th className="text-center py-1" style={{ width: '70px', fontSize: '0.7rem' }}>GRADE</th>
                                                <th className="py-1" style={{ fontSize: '0.7rem' }}>REMARKS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.subjects.map((sub, i) => (
                                                <tr key={i}>
                                                    <td className="fw-bold px-2 py-1" style={{ color: '#1a1a1a' }}>{sub.subjectName}</td>
                                                    <td className="text-center fw-bold py-1" style={{ color: '#1a1a1a' }}>{sub.score}</td>
                                                    <td className="text-center py-1"><span className="badge bg-light text-dark border border-dark" style={{ fontSize: '0.65rem' }}>{sub.grade}</span></td>
                                                    <td className="py-1" style={{ fontSize: '0.7rem', color: '#333' }}>{sub.remarks}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* School Notice & Remarks - Horizontal Layout */}
                                <div className="border rounded-2 p-2 bg-light mb-2">
                                    <div className="row g-2 mb-2">
                                        <div className="col-md-6">
                                            <small className="text-uppercase fw-bold text-dark" style={{ fontSize: '0.65rem', color: '#1a1a1a' }}>Fees Owed</small>
                                            <p className="mb-0 fw-black text-dark" style={{ fontSize: '0.8rem', color: '#1a1a1a' }}>{formatCurrency(report.feesOwed)}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <small className="text-uppercase fw-bold text-dark" style={{ fontSize: '0.65rem', color: '#1a1a1a' }}>Next Term Fees</small>
                                            <p className="mb-0 fw-black text-dark" style={{ fontSize: '0.8rem', color: '#1a1a1a' }}>{formatCurrency(report.nextTermFees)}</p>
                                        </div>
                                    </div>
                                    <div className="border-top pt-2">
                                        <div className="row g-2">
                                            <div className="col-md-4">
                                                <p className="mb-1 x-small fw-bold text-dark" style={{ fontSize: '0.65rem', color: '#1a1a1a' }}>Headmaster's Remark</p>
                                                <p className="mb-1 x-small text-dark" style={{ fontSize: '0.65rem', color: '#333', lineHeight: '1.2' }}>{settings?.headMasterRemark || 'A great effort has been made this term. Keep up the good work.'}</p>
                                            </div>
                                            <div className="col-md-4">
                                                <p className="mb-1 x-small fw-bold text-dark" style={{ fontSize: '0.65rem', color: '#1a1a1a' }}>Teacher's Remark</p>
                                                <p className="mb-1 x-small text-dark" style={{ fontSize: '0.65rem', color: '#333', lineHeight: '1.2' }}>{settings?.teacherRemark || 'Consistent effort and steady improvement are encouraged.'}</p>
                                            </div>
                                            <div className="col-md-4">
                                                <p className="mb-1 x-small fw-bold text-dark" style={{ fontSize: '0.65rem', color: '#1a1a1a' }}>Next Term Begins</p>
                                                <p className="mb-0 x-small text-dark" style={{ fontSize: '0.65rem', color: '#333', lineHeight: '1.2' }}>{settings?.nextTermBegins ? new Date(settings.nextTermBegins).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be announced soon.'}</p>
                                            </div>
                                            {settings?.staffRemarks && Array.isArray(settings.staffRemarks) && settings.staffRemarks.length > 0 && (
                                                <>
                                                    {settings.staffRemarks.map((remark, idx) => (
                                                        <div className="col-md-4" key={idx}>
                                                            <p className="mb-1 x-small fw-bold text-dark" style={{ fontSize: '0.65rem', color: '#1a1a1a' }}>{remark.staffName || `Staff Remark ${idx + 1}`}</p>
                                                            <p className="mb-1 x-small text-dark" style={{ fontSize: '0.65rem', color: '#333', lineHeight: '1.2' }}>{remark.remarks || 'No remarks.'}</p>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Signatures */}
                                <div className="mt-auto pt-2">
                                    <div className="row align-items-end text-center">
                                        <div className="col-4">
                                            <div style={{ height: '35px' }} className="d-flex align-items-end justify-content-center mb-0">
                                                {settings?.headTeacherSign && <img src={settings.headTeacherSign} alt="Sign" style={{ maxHeight: '35px' }} />}
                                            </div>
                                            <div className="border-top border-dark mx-1 pt-0">
                                                <p className="x-small mb-0 fw-bold" style={{ fontSize: '0.65rem', color: '#1a1a1a' }}>HEADMASTER</p>
                                                <small className="text-dark" style={{fontSize: '0.6rem', color: '#333'}}>{settings?.headMasterName || 'Signatory'}</small>
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div style={{ height: '50px' }} className="d-flex align-items-center justify-content-center">
                                                {settings?.schoolStamp && <img src={settings.schoolStamp} alt="Stamp" style={{ maxHeight: '50px', opacity: '0.5' }} />}
                                            </div>
                                            <small className="text-dark fw-bold" style={{fontSize: '0.6rem', color: '#1a1a1a'}}>OFFICIAL STAMP</small>
                                        </div>
                                        <div className="col-4">
                                            <div style={{ height: '35px' }} className="d-flex align-items-end justify-content-center mb-0">
                                                {getMasterSignature(report.formMasterName) && (
                                                    <img src={getMasterSignature(report.formMasterName)} alt="Sign" style={{ maxHeight: '35px' }} />
                                                )}
                                            </div>
                                            <div className="border-top border-dark mx-1 pt-0">
                                                <p className="x-small mb-0 fw-bold" style={{ fontSize: '0.65rem', color: '#1a1a1a' }}>FORM MASTER</p>
                                                <small className="text-dark" style={{fontSize: '0.6rem', color: '#333'}}>{report.formMasterName || '________________'}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="report-footer-actions no-print d-flex flex-wrap justify-content-center gap-3 mt-auto">
                                <button className="btn btn-success fw-bold px-4 rounded-pill d-flex align-items-center gap-2" onClick={() => handleSendIndividual(report, 'whatsapp')}>
                                    <MessageSquare size={18}/> WhatsApp Parent
                                </button>
                                <button className="btn btn-primary fw-bold px-4 rounded-pill d-flex align-items-center gap-2" onClick={() => handleSendIndividual(report, 'email')} disabled={actionLoading}>
                                    {actionLoading ? <Loader2 className="spin" size={18} /> : <Mail size={18}/>} Email Parent
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReportCard;