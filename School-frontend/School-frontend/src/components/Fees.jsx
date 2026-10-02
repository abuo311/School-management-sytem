import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import API from '../services/api';
import {
    Wallet, Search, History, BadgeCheck, Loader2, Trash2, Printer, CreditCard, FileText
} from 'lucide-react';

const Fees = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [issuingFees, setIssuingFees] = useState(false);
    const [paystackConfigured, setPaystackConfigured] = useState(null);
    const [payment, setPayment] = useState({ amount: '' });
    const [feeIssueSummary, setFeeIssueSummary] = useState(null);
    const [receiptData, setReceiptData] = useState(null);

    const [schoolInfo, setSchoolInfo] = useState({
        schoolName: 'ASONKWAA M/A BASIC SCHOOL',
        academicYear: '2025/2026',
        currentTerm: 'Term 1',
        nextTermFees: 0,
        address: 'Nkoranza-South, Asonkwaa',
        phone: '+233 24 344 4321',
        email: 'asonkwaabasic@edu.gh'
    });
    const configuredTermFee = Number(schoolInfo.nextTermFees || 0);

    const showToast = (message, type = 'success') => {
        const toastEl = document.getElementById('feeToast');
        if (!toastEl) return;
        const toastBody = toastEl.querySelector('.toast-body');
        toastEl.className = `toast align-items-center text-white border-0 bg-${type === 'success' ? 'success' : 'danger'}`;
        toastBody.innerText = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    };

    const getStudentTermFee = (student, feeRecords = student?.feeHistory || []) => {
        if (!student) return Number(schoolInfo.nextTermFees || 0);
        if (Number(student.currentFeeAssessedAmount) > 0) {
            return Number(student.currentFeeAssessedAmount);
        }
        const savedBills = feeRecords
            .filter(record =>
                record.term?.toLowerCase() === schoolInfo.currentTerm?.toLowerCase() &&
                record.academicYear?.toLowerCase() === schoolInfo.academicYear?.toLowerCase() &&
                Number(record.totalBill) > 0)
            .map(record => Number(record.totalBill));

        return savedBills.length ? Math.max(...savedBills) : Number(schoolInfo.nextTermFees || 0);
    };

    const getCyclePayments = (student, feeRecords = student?.feeHistory || []) => feeRecords.filter(record =>
        record.term?.toLowerCase() === schoolInfo.currentTerm?.toLowerCase() &&
        record.academicYear?.toLowerCase() === schoolInfo.academicYear?.toLowerCase());

    const getStudentOutstanding = (student, feeRecords = student?.feeHistory || []) => {
        if (!student) return 0;
        if (Number(student.currentFeeAssessedAmount) > 0) {
            return Math.max(0, Number(student.currentFeeBalance || 0));
        }
        const paid = getCyclePayments(student, feeRecords)
            .reduce((total, record) => total + Number(record.amountPaid || 0), 0);
        return Math.max(0, getStudentTermFee(student, feeRecords) - paid);
    };

    useEffect(() => {
        fetchStudents();
        fetchSettings();
        fetchPaystackStatus();
    }, []);

    useEffect(() => {
        const reference = new URLSearchParams(window.location.search).get('reference');
        if (!reference) return;

        API.post('/paystack/verify', { reference })
            .then(async response => {
                if (response.data?.verified) {
                    showToast('Online payment verified successfully');
                    await fetchStudents();
                    if (selectedStudent?.id) {
                        const historyResponse = await API.get(`/fees/student/${selectedStudent.id}`);
                        setHistory((historyResponse.data || []).sort((a, b) => b.id - a.id));
                    }
                }
            })
            .catch(error => showToast(error.response?.data?.message || 'Payment verification failed', 'danger'))
            .finally(() => window.history.replaceState({}, document.title, window.location.pathname));
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await API.get('/settings');
            if (res.data) {
                setSchoolInfo(prev => ({ ...prev, ...res.data }));
            }
        } catch (err) {
            console.error("Failed to load settings", err);
        }
    };

    const fetchPaystackStatus = async () => {
        try {
            const response = await API.get('/paystack/status');
            setPaystackConfigured(Boolean(response.data?.configured));
        } catch (err) {
            setPaystackConfigured(false);
            console.error('Paystack readiness check failed', err);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await API.get('/students');
            // Use the data directly from the server instead of resetting to 0
            const studentList = res.data || [];
            setStudents(studentList);
            if (selectedStudent?.id) {
                const refreshedStudent = studentList.find(s => s.id === selectedStudent.id);
                if (refreshedStudent) setSelectedStudent(refreshedStudent);
            }
        } catch (err) {
            showToast("Failed to load students", "danger");
            console.error("Student fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setHistory([]);
        setPayment({ amount: '' });
        try {
            const res = await API.get(`/fees/student/${student.id}`);
            const studentHistory = res.data || [];
            setHistory(studentHistory.sort((a, b) => b.id - a.id));
        } catch (err) { console.error(err); }
    };

    const handlePayment = async () => {
        const amount = parseFloat(payment.amount || 0);
        if (!selectedStudent?.id) return showToast("Please select a student first", "danger");
        if (amount <= 0) return showToast("Please enter an amount", "danger");
        const outstanding = getStudentOutstanding(selectedStudent, history);
        if (amount > outstanding) return showToast("Cash received cannot exceed the outstanding balance", "danger");
        setActionLoading(true);

        const payload = {
            student: { id: parseInt(selectedStudent.id) },
            amountPaid: amount,
            paymentMethod: 'Cash',
        };

        try {
            await API.post('/fees/pay', payload);
            showToast("Payment Recorded Successfully");
            setPayment(prev => ({ ...prev, amount: '' }));
            await fetchStudents();
            const res = await API.get(`/fees/student/${selectedStudent.id}`);
            setHistory((res.data || []).sort((a, b) => b.id - a.id));
        } catch (err) {
            showToast(err.response?.data?.message || "Error saving payment.", "danger");
        } finally { setActionLoading(false); }
    };

    const issueTermFees = async () => {
        if (!Number.isFinite(configuredTermFee) || configuredTermFee <= 0) {
            return showToast('No saved term fee is configured. Open Settings, enter Termly Fees, and save changes first.', 'danger');
        }
        setIssuingFees(true);
        try {
            const response = await API.post('/fees/assessments/issue');
            setFeeIssueSummary(response.data);
            if (response.data.assessedCount > 0) {
                showToast(`Issued fees to ${response.data.assessedCount} learners for ${response.data.term}`);
            } else if (response.data.activeLearnerCount > 0) {
                showToast(`Fees are already issued for ${response.data.totalAssessedCount} of ${response.data.activeLearnerCount} active learners`);
            } else {
                showToast('There are no active learners to assess', 'danger');
            }
            await fetchStudents();
        } catch (err) {
            showToast(err.response?.data?.message || 'Unable to issue term fees', 'danger');
        } finally {
            setIssuingFees(false);
        }
    };

    const startOnlinePayment = async () => {
        if (!paystackConfigured) {
            return showToast('Online payments are not configured. Contact the system administrator.', 'danger');
        }
        const amount = Number(payment.amount);
        const outstanding = getStudentOutstanding(selectedStudent, history);
        if (!selectedStudent?.id) return showToast('Please select a learner first', 'danger');
        if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding) {
            return showToast('Enter a positive amount no greater than the outstanding balance', 'danger');
        }
        setActionLoading(true);
        try {
            const response = await API.post('/paystack/initialize', {
                studentId: selectedStudent.id,
                amount
            });
            window.location.assign(response.data.authorizationUrl);
        } catch (err) {
            showToast(err.response?.data?.message || 'Unable to start online payment', 'danger');
            setActionLoading(false);
        }
    };

    const handleDeletePayment = async (feeId) => {
        if (!feeId) return showToast("This payment record has no valid ID.", "danger");
        if (!window.confirm("Are you sure you want to delete this payment record?")) return;
        try {
            await API.post(`/fees/delete/${feeId}`);
            setHistory(previousHistory => previousHistory.filter(record => record.id !== feeId));
            showToast("Record deleted successfully");
            await fetchStudents();
            const res = await API.get(`/fees/student/${selectedStudent.id}`);
            const refreshedHistory = (res.data || []).filter(record => record.id !== feeId);
            setHistory(refreshedHistory.sort((a, b) => b.id - a.id));
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to delete record", "danger");
        }
    };

    const handlePrintReceipt = (h) => {
        setReceiptData(h);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const getStatus = (student) => {
        const bal = getStudentOutstanding(student);
        const hasAssessment = getStudentTermFee(student) > 0;
        const paidCount = getCyclePayments(student).length;
        if (hasAssessment && bal === 0)
            return { label: "Paid Fully", color: "bg-success text-white", cardColor: "bg-success text-white" };
        if (hasAssessment && paidCount > 0 && bal > 0)
            return { label: "Incomplete", color: "bg-warning text-dark", cardColor: "bg-warning text-dark" };
        if (hasAssessment)
            return { label: "Not Yet Pay", color: "bg-danger text-white", cardColor: "bg-danger text-white" };
        if (paidCount > 0 && bal === 0)
            return { label: "Paid Fully", color: "bg-success text-white", cardColor: "bg-success text-white" };
        return { label: "Not Yet Pay", color: "bg-danger text-white", cardColor: "bg-danger text-white" };
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
        const status = getStatus(s).label;
        return statusFilter === 'All' ? matchesSearch : matchesSearch && status === statusFilter;
    });

    return (
        <div className="container-fluid py-4 bg-light min-vh-100 text-start">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #receipt-print, #receipt-print * { visibility: visible; }
                    #receipt-print { 
                        position: fixed; 
                        left: 50%; 
                        top: 20px; 
                        transform: translateX(-50%); 
                        width: 90%; 
                        max-width: 650px;
                        padding: 30px !important;
                        border: 2px solid #333 !important;
                        background: white !important;
                    }
                    .no-print { display: none !important; }
                    @page { margin: 1cm; }
                }
            `}</style>

            {/* --- HIDDEN RECEIPT TEMPLATE --- */}
            <div id="receipt-print" className="d-none d-print-block bg-white shadow-sm rounded">
                <div className="text-center mb-4 pb-3 border-bottom">
                    <h1 className="fw-bold mb-0" style={{ fontSize: '24pt' }}>{schoolInfo.schoolName.toUpperCase()}</h1>
                    <p className="mb-0">{schoolInfo.address}</p>
                    <p className="mb-0">Tel: {schoolInfo.phone} | Email: {schoolInfo.email}</p>
                    <h4 className="fw-bold mt-4 text-decoration-underline">OFFICIAL PAYMENT RECEIPT</h4>
                </div>

                <div className="row mb-4">
                    <div className="col-6 text-start">
                        <p className="mb-1"><strong>Student:</strong> {selectedStudent?.firstName} {selectedStudent?.lastName}</p>
                        <p className="mb-1"><strong>Class:</strong> {selectedStudent?.gradeLevel}</p>
                        <p className="mb-1"><strong>ID:</strong> {selectedStudent?.admissionNumber || 'N/A'}</p>
                    </div>
                    <div className="col-6 text-end">
                        <p className="mb-1"><strong>Date:</strong> {receiptData?.datePaid}</p>
                        <p className="mb-1"><strong>Receipt #:</strong> {receiptData?.id?.toString().padStart(5, '0')}</p>
                        <p className="mb-1"><strong>Period:</strong> {receiptData?.academicYear} - {receiptData?.term}</p>
                    </div>
                </div>

                <table className="table table-bordered border-dark">
                    <thead className="table-light">
                        <tr className="text-center">
                            <th>DESCRIPTION</th>
                            <th style={{ width: '150px' }}>AMOUNT (₵)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ height: '100px' }}>
                            <td className="align-middle ps-3">School Fees Payment / Arrears Settlement</td>
                            <td className="align-middle text-end pe-3 fw-bold">₵{receiptData?.amountPaid.toLocaleString()}</td>
                        </tr>
                    </tbody>
                    <tfoot className="fw-bold">
                        <tr>
                            <td className="text-end pe-3">GRAND TOTAL PAID</td>
                            <td className="text-end pe-3">₵{receiptData?.amountPaid.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td className="text-end pe-3 text-danger">OUTSTANDING BALANCE</td>
                            <td className="text-end pe-3 text-danger">₵{receiptData?.balance.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-5 row pt-5">
                    <div className="col-6 text-center">
                        <div className="mx-auto" style={{ width: '180px', borderTop: '1px solid #000' }}>Cashier Signature</div>
                    </div>
                    <div className="col-6 text-center">
                        <div className="mx-auto" style={{ width: '180px', borderTop: '1px solid #000' }}>Parent/Guardian</div>
                    </div>
                </div>
                <p className="text-center small text-muted mt-5 pt-4">*** This is a computer-generated receipt ***</p>
            </div>

            {/* --- UI COMPONENTS --- */}
            <div className="toast-container position-fixed top-0 end-0 p-3 no-print" style={{ zIndex: 1100 }}>
                <div id="feeToast" className="toast align-items-center border-0" role="alert" aria-live="assertive" aria-atomic="true">
                    <div className="d-flex">
                        <div className="toast-body fw-bold">Message</div>
                        <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            </div>

            <header className="mb-4 d-flex justify-content-between align-items-center no-print">
                <h3 className="fw-bold text-start"><Wallet className="me-2 text-primary" /> Fee Management</h3>
                <div className="d-flex gap-2 align-items-center flex-wrap justify-content-end">
                    <button type="button" className="btn btn-dark d-flex align-items-center gap-2" onClick={issueTermFees} disabled={issuingFees || students.length === 0 || configuredTermFee <= 0} title={configuredTermFee <= 0 ? 'Set and save a positive Termly Fees amount in Settings first' : `Issue ${schoolInfo.currentTerm} at ₵${configuredTermFee.toLocaleString()} per learner`}>
                        {issuingFees ? <Loader2 size={17} className="animate-spin" /> : <FileText size={17} />}
                        {issuingFees ? 'Issuing Fees...' : `Issue ${schoolInfo.currentTerm} Fees`}
                    </button>
                    {loading && <div className="spinner-border spinner-border-sm text-primary me-2"></div>}
                    <select className="form-select border-0 shadow-sm rounded-pill" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">All Students</option>
                        <option value="Paid Fully">Paid Fully</option>
                        <option value="Incomplete">Balance Owed</option>
                        <option value="Not Yet Pay">Not Yet Paid</option>
                    </select>
                </div>
            </header>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-white border rounded px-3 py-2 mb-4 no-print">
                <div className="small">
                    <strong>{schoolInfo.currentTerm} · {schoolInfo.academicYear}</strong>
                    <span className="text-muted"> · Configured term fee: </span>
                    <strong>₵{configuredTermFee.toLocaleString()}</strong>
                </div>
                <div className="small text-muted">
                    {feeIssueSummary
                        ? `${feeIssueSummary.totalAssessedCount}/${feeIssueSummary.activeLearnerCount} learners assessed`
                        : `${students.filter(student => Number(student.currentFeeAssessedAmount) > 0).length}/${students.length} learners assessed`}
                </div>
            </div>
            {configuredTermFee <= 0 && (
                <div className="alert alert-warning py-2 mb-4 no-print" role="status">
                    Termly Fees is not saved as a positive amount. Set it in Settings and save before issuing this term's fees.
                </div>
            )}

            <div className="row g-4 no-print">
                {/* Sidebar */}
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden text-start">
                        <div className="p-3 border-bottom bg-light">
                            <div className="input-group rounded-pill bg-white shadow-sm px-3 py-1">
                                <Search size={18} className="text-muted mt-2 me-2" />
                                <input type="text" className="form-control border-0 bg-transparent shadow-none" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="list-group list-group-flush" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {filteredStudents.map(s => {
                                const status = getStatus(s);
                                return (
                                    /* BLACK SELECTOR LOGIC: Swapped bg-primary for bg-dark */
                                    <button key={s.id} onClick={() => selectStudent(s)} className={`list-group-item list-group-item-action border-0 p-3 transition-all ${selectedStudent?.id === s.id ? 'bg-dark text-white shadow' : ''}`}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className={`fw-bold ${selectedStudent?.id === s.id ? 'text-white' : ''}`}>{s.firstName} {s.lastName}</div>
                                                <div className={`small ${selectedStudent?.id === s.id ? 'text-white-50' : 'opacity-75'}`}>{s.gradeLevel}</div>
                                                <div className={`small ${selectedStudent?.id === s.id ? 'text-white-50' : 'text-muted'}`}>
                                                    {schoolInfo.currentTerm} fee: ₵{getStudentTermFee(s).toLocaleString()} · Owed: ₵{getStudentOutstanding(s).toLocaleString()}
                                                </div>
                                            </div>
                                            <span className={`badge rounded-pill ${status.color}`} style={{ fontSize: '10px' }}>{status.label}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="col-md-8">
                    {selectedStudent ? (
                        <>
                            <div className={`card border-0 shadow-sm p-4 mb-4 rounded-4 transition-all text-start ${getStatus(selectedStudent).cardColor}`}>
                                <p className="small text-uppercase fw-bold opacity-75 mb-0">{schoolInfo.currentTerm} Outstanding Balance</p>
                                <h2 className="fw-bold mb-0">₵{getStudentOutstanding(selectedStudent, history).toLocaleString()}</h2>
                                <small>Assessed: ₵{getStudentTermFee(selectedStudent, history).toLocaleString()} · Paid: ₵{getCyclePayments(selectedStudent, history).reduce((total, record) => total + Number(record.amountPaid || 0), 0).toLocaleString()}</small>
                            </div>

                            <div className="card border-0 shadow-sm p-4 mb-4 rounded-4 bg-white text-start">
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="small fw-bold text-secondary">Total {schoolInfo.currentTerm} Fee</label>
                                        <input type="number" className="form-control border-secondary-subtle bg-light" value={getStudentTermFee(selectedStudent, history)} readOnly />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="small fw-bold text-primary">Amount to pay</label>
                                        <input type="number" min="0.01" max={getStudentOutstanding(selectedStudent, history)} step="0.01" className="form-control border-primary" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} placeholder="0.00" />
                                    </div>
                                    <div className="col-12 mt-3">
                                        <button className="btn btn-dark w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={handlePayment} disabled={actionLoading || !selectedStudent?.id || getStudentOutstanding(selectedStudent, history) <= 0 || Number(payment.amount) <= 0 || Number(payment.amount) > getStudentOutstanding(selectedStudent, history)}>
                                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <BadgeCheck size={18} />}
                                            {actionLoading ? "Processing..." : "Record Cash Payment"}
                                        </button>
                                        <button className="btn btn-outline-primary w-100 mt-2 py-2 fw-bold d-flex align-items-center justify-content-center gap-2" onClick={startOnlinePayment} disabled={actionLoading || paystackConfigured === null || !paystackConfigured || getStudentOutstanding(selectedStudent, history) <= 0 || Number(payment.amount) <= 0 || Number(payment.amount) > getStudentOutstanding(selectedStudent, history)} title={!paystackConfigured ? 'Configure PAYSTACK_SECRET_KEY on the backend to enable online payments' : 'Start secure Paystack checkout'}>
                                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />} {paystackConfigured === null ? 'Checking online payment...' : paystackConfigured ? 'Pay Online with Paystack' : 'Paystack Not Configured'}
                                        </button>
                                        <small className="text-muted d-block mt-2">Cash is recorded by the bursar. Online payment is confirmed by Paystack before it appears in transaction history.{paystackConfigured === false ? ' The administrator must configure PAYSTACK_SECRET_KEY on the backend.' : ''}</small>
                                    </div>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white text-start">
                                <div className="p-3 border-bottom bg-light d-flex align-items-center">
                                    <History size={18} className="me-2 text-muted" />
                                    <span className="fw-bold small text-muted">Recent Transactions</span>
                                </div>
                                <table className="table table-hover mb-0">
                                    <thead className="table-light small text-uppercase">
                                        <tr>
                                            <th className="ps-3">Date</th>
                                            <th>Paid</th>
                                            <th>New Balance</th>
                                            <th className="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((h) => (
                                            <tr key={h.id}>
                                                <td className="ps-3 small text-muted align-middle">{h.datePaid}</td>
                                                <td className="text-success fw-bold align-middle">₵{h.amountPaid}</td>
                                                <td className="fw-bold align-middle">₵{h.balance}</td>
                                                <td className="text-center align-middle">
                                                    <div className="d-flex justify-content-center gap-1">
                                                        <button className="btn btn-sm btn-outline-primary border-0 rounded-pill" onClick={() => handlePrintReceipt(h)} title="Print Receipt">
                                                            <Printer size={16} />
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger border-0 rounded-pill" onClick={() => handleDeletePayment(h.id)} title="Delete Record">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="h-100 d-flex flex-column align-items-center justify-content-center p-5 bg-white rounded-4 shadow-sm border border-dashed text-center">
                            <Wallet size={48} className="text-muted mb-3 opacity-25" />
                            <h5 className="text-muted">Selection Required</h5>
                            <p className="text-muted small">Pick a student from the sidebar to manage payments.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Fees;