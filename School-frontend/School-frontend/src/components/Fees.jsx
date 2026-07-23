import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import API from '../services/api';
import {
    Wallet, Search, History, BadgeCheck, Loader2, Trash2, Printer
} from 'lucide-react';

const Fees = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [payment, setPayment] = useState({ amount: '', totalBill: '', method: 'Cash' });
    const [receiptData, setReceiptData] = useState(null);

    const [schoolInfo, setSchoolInfo] = useState({
        schoolName: 'ASONKWAA M/A BASIC SCHOOL',
        currentTerm: 'Term 1',
        address: 'Nkoranza-South, Asonkwaa',
        phone: '+233 24 344 4321',
        email: 'asonkwaabasic@edu.gh'
    });

    const showToast = (message, type = 'success') => {
        const toastEl = document.getElementById('feeToast');
        if (!toastEl) return;
        const toastBody = toastEl.querySelector('.toast-body');
        toastEl.className = `toast align-items-center text-white border-0 bg-${type === 'success' ? 'success' : 'danger'}`;
        toastBody.innerText = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    };

    useEffect(() => {
        fetchStudents();
        fetchSettings();
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

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await API.get('/students');
            // Use the data directly from the server instead of resetting to 0
            const studentList = res.data || [];
            setStudents(studentList);
        } catch (err) {
            showToast("Failed to load students", "danger");
            console.error("Student fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setPayment({ amount: '', totalBill: student.lastBalance || '', method: 'Cash' });
        try {
            const res = await API.get(`/fees/student/${student.id}`);
            setHistory((res.data || []).sort((a, b) => b.id - a.id));
        } catch (err) { console.error(err); }
    };

    const handlePayment = async () => {
        const amount = parseFloat(payment.amount || 0);
        const bill = parseFloat(payment.totalBill || 0);
        if (!selectedStudent?.id) return showToast("Please select a student first", "danger");
        if (amount <= 0) return showToast("Please enter an amount", "danger");
        setActionLoading(true);

        const payload = {
            student: { id: parseInt(selectedStudent.id) },
            amountPaid: amount,
            totalBill: bill,
            // ADD THIS LINE:
            balance: bill - amount,
            paymentMethod: payment.method,
            term: schoolInfo.currentTerm,
            academicYear: "2025/2026",
            datePaid: new Date().toISOString().split('T')[0],
            receivedBy: "Admin"
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

    const handleDeletePayment = async (feeId) => {
        if (!window.confirm("Are you sure you want to delete this payment record?")) return;
        try {
            await API.delete(`/fees/${feeId}`);
            showToast("Record deleted successfully");
            await fetchStudents();
            const res = await API.get(`/fees/student/${selectedStudent.id}`);
            setHistory((res.data || []).sort((a, b) => b.id - a.id));
        } catch (err) { showToast("Failed to delete record", "danger"); }
    };

    const handlePrintReceipt = (h) => {
        setReceiptData(h);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const getStatus = (student) => {
        const bal = parseFloat(student.lastBalance || 0);
        const paidCount = parseInt(student.totalPaid || 0);
        if (paidCount > 0 && bal === 0)
            return { label: "Paid Fully", color: "bg-success text-white", cardColor: "bg-success text-white" };
        if (paidCount > 0 && bal > 0)
            return { label: "Incomplete", color: "bg-warning text-dark", cardColor: "bg-warning text-dark" };
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
                <div className="d-flex gap-2 align-items-center">
                    {loading && <div className="spinner-border spinner-border-sm text-primary me-2"></div>}
                    <select className="form-select border-0 shadow-sm rounded-pill" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">All Students</option>
                        <option value="Paid Fully">Paid Fully</option>
                        <option value="Incomplete">Balance Owed</option>
                        <option value="Not Yet Pay">Not Yet Paid</option>
                    </select>
                </div>
            </header>

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
                                <p className="small text-uppercase fw-bold opacity-75 mb-0">Current {getStatus(selectedStudent).label} Balance</p>
                                <h2 className="fw-bold mb-0">₵{(selectedStudent.lastBalance || 0).toLocaleString()}</h2>
                            </div>

                            <div className="card border-0 shadow-sm p-4 mb-4 rounded-4 bg-white text-start">
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="small fw-bold text-secondary">Total Fee / Arrears</label>
                                        <input type="number" className="form-control border-secondary-subtle bg-light" value={payment.totalBill} onChange={e => setPayment({ ...payment, totalBill: e.target.value })} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="small fw-bold text-primary">Paying Now</label>
                                        <input type="number" className="form-control border-primary" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} placeholder="0.00" />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="small fw-bold text-secondary">Method</label>
                                        <select className="form-select" value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })}>
                                            <option>Cash</option><option>Mobile Money</option>
                                        </select>
                                    </div>
                                    <div className="col-12 mt-3">
                                        <button className="btn btn-dark w-100 py-2 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2" onClick={handlePayment} disabled={actionLoading || !selectedStudent?.id}>
                                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <BadgeCheck size={18} />}
                                            {actionLoading ? "Processing..." : "Record Payment"}
                                        </button>
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