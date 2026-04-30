import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import API from '../services/api';
import {
    TrendingUp, History, CheckCircle2, Calendar,
    FileSpreadsheet, ShieldCheck, AlertOctagon, WifiOff
} from 'lucide-react';

const PromotionManager = () => {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [serverError, setServerError] = useState(false);

    const goldColor = '#d4af37';
    const darkBg = '#1a1a1a';

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await API.get('/promotion/history');
            setHistory(res.data || []);
            setServerError(false);
        } catch (err) {
            console.error("Connection failed", err);
            setServerError(true);
        }
    };

    const backupAttendanceToExcel = async (isManual = false) => {
        try {
            // Test connection first
            const res = await API.get('/attendance');
            const data = res.data || [];

            if (data.length === 0) {
                if (isManual) alert("Registry is empty. Nothing to back up.");
                return true;
            }

            // Proper data mapping with fallbacks for missing fields
            const worksheetData = data.map(record => ({
                "Date": record.attendanceDate || 'N/A',
                "Student": `${record.student?.firstName || 'Unknown'} ${record.student?.lastName || ''}`,
                "Class": record.student?.gradeLevel || 'N/A',
                "Status": record.status || 'N/A',
                "System_Timestamp": new Date().toLocaleString()
            }));

            const ws = XLSX.utils.json_to_sheet(worksheetData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "AttendanceLog");

            // Direct trigger for browser download
            XLSX.writeFile(wb, `School_Backup_${new Date().getFullYear()}.xlsx`);

            if (isManual) alert("Excel file generated and downloaded.");
            return true;
        } catch (err) {
            console.error("Backup Error:", err);
            alert("SERVER ERROR: Could not reach the database. Please ensure the backend is running.");
            return false;
        }
    };

    const handlePromotion = async () => {
        if (!window.confirm("CRITICAL: This clears current logs after backup. Proceed?")) return;

        setLoading(true);
        const backupSuccess = await backupAttendanceToExcel(false);

        if (backupSuccess) {
            try {
                await API.post('/promotion/process');
                await API.delete('/attendance/clear-all');
                alert("Promotion successful. Data archived.");
                fetchHistory();
            } catch (err) {
                alert("Promotion command failed. Data was NOT cleared.");
            }
        }
        setLoading(false);
    };

    return (
        <div className="container-fluid py-4 text-start animate__animated animate__fadeIn">
            {serverError && (
                <div className="alert alert-dark border-0 shadow-sm d-flex align-items-center gap-3 mb-4" style={{ backgroundColor: '#fff5f5' }}>
                    <WifiOff className="text-danger" />
                    <span className="text-danger fw-bold small">OFFLINE: System cannot reach the server. Check your connection.</span>
                </div>
            )}

            <header className="mb-4 border-bottom pb-3">
                <h3 className="fw-black text-uppercase m-0" style={{ color: darkBg }}>Transition Hub</h3>
                <small className="text-muted font-monospace">SECURE DATA ARCHIVING & PROMOTION</small>
            </header>

            <div className="row g-4">
                <div className="col-md-5">
                    <div className="card border-0 shadow-sm p-4 rounded-4 bg-white h-100" style={{ borderTop: `6px solid ${darkBg}` }}>
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="p-3 rounded-4" style={{ backgroundColor: `${goldColor}15`, color: darkBg }}>
                                <TrendingUp size={30} />
                            </div>
                            <div>
                                <h6 className="fw-black mb-0">ANNUAL PROMOTION</h6>
                                <p className="text-muted x-small mb-0">Moves all students to next grade</p>
                            </div>
                        </div>

                        <div className="p-3 rounded-3 mb-3 border-start border-4" style={{ backgroundColor: '#fcfcfc', borderColor: goldColor }}>
                            <div className="d-flex gap-2 align-items-center mb-1">
                                <ShieldCheck size={16} style={{ color: goldColor }}/>
                                <span className="fw-black small text-uppercase">Auto-Archive Active</span>
                            </div>
                            <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                                A spreadsheet will be saved to your device automatically before data is reset.
                            </p>
                        </div>

                        <div className="alert border-0 small d-flex gap-2 align-items-center" style={{ backgroundColor: '#fdf0ef', color: '#e74a3b' }}>
                            <AlertOctagon size={18} />
                            <span>This reset is permanent for attendance logs.</span>
                        </div>

                        <div className="mt-auto pt-3">
                            <button className="btn btn-dark w-100 py-3 fw-bold shadow mb-2" onClick={handlePromotion} disabled={loading || serverError}>
                                {loading ? <span className="spinner-border spinner-border-sm"></span> : 'RUN GLOBAL PROMOTION'}
                            </button>
                            <button className="btn btn-outline-dark w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
                                    onClick={() => backupAttendanceToExcel(true)} disabled={loading || serverError} style={{ borderStyle: 'dashed' }}>
                                <FileSpreadsheet size={18} style={{ color: goldColor }}/> MANUAL BACKUP
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-md-7">
                    <div className="card border-0 shadow-sm p-4 rounded-4 bg-white h-100">
                        <h6 className="fw-black text-muted text-uppercase mb-4 d-flex align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
                            <History size={16}/> System History
                        </h6>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="bg-dark text-warning small text-uppercase">
                                <tr>
                                    <th className="py-3 px-3">Date</th>
                                    <th>Academic Year</th>
                                    <th className="text-center">Total Pupils</th>
                                    <th className="text-end px-3">Result</th>
                                </tr>
                                </thead>
                                <tbody>
                                {history.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-3"><Calendar size={14} className="me-2 text-muted"/> {new Date(log.promotionDate).toLocaleDateString()}</td>
                                        <td className="fw-bold">{log.academicYear}</td>
                                        <td className="text-center">
                                                <span className="badge rounded-pill px-3" style={{ backgroundColor: `${goldColor}20`, color: darkBg }}>
                                                    {log.studentCount}
                                                </span>
                                        </td>
                                        <td className="text-end px-3 text-success fw-bold"><CheckCircle2 size={14} className="me-1"/> SUCCESS</td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr><td colSpan="4" className="text-center py-5 text-muted small">No previous records found.</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromotionManager;