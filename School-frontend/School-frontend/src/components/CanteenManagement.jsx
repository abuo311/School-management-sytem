import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Search, Utensils, Wallet } from 'lucide-react';
import API from '../services/api';

const formatCurrency = amount => `GHS ${Number(amount || 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;

const formatFrequency = frequency => ({
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    TERMLY: 'Termly'
}[frequency?.toUpperCase()] || frequency || 'Termly');

const CanteenManagement = () => {
    const [balances, setBalances] = useState([]);
    const [settings, setSettings] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [search, setSearch] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [balancesResponse, settingsResponse] = await Promise.all([
                API.get('/canteen/balances'),
                API.get('/settings')
            ]);
            const nextBalances = balancesResponse.data || [];
            setBalances(nextBalances);
            setSettings(settingsResponse.data || null);
            return nextBalances;
        } catch (requestError) {
            console.error('Canteen management load error:', requestError);
            setError(requestError.response?.data?.message || 'Unable to load canteen balances. Please try again.');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const loadPaymentHistory = async studentId => {
        setHistoryLoading(true);
        try {
            const response = await API.get(`/canteen/payments/student/${studentId}`);
            setPaymentHistory(response.data || []);
        } catch (requestError) {
            console.error('Canteen payment history error:', requestError);
            setError(requestError.response?.data?.message || 'Unable to load this student’s canteen payment history.');
            setPaymentHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const selectStudent = studentBalance => {
        setSelectedStudent(studentBalance);
        setPaymentAmount('');
        setNotice('');
        setError('');
        loadPaymentHistory(studentBalance.student.id);
    };

    const submitPayment = async event => {
        event.preventDefault();
        if (!selectedStudent) return;
        const amount = Number(paymentAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a payment amount greater than zero.');
            return;
        }
        if (amount > Number(selectedStudent.balance)) {
            setError('Payment cannot exceed the current outstanding balance.');
            return;
        }

        setSaving(true);
        setError('');
        setNotice('');
        try {
            await API.post('/canteen/payments', {
                studentId: selectedStudent.student.id,
                amountPaid: amount,
                paymentMethod
            });
            setNotice('Canteen payment recorded.');
            setPaymentAmount('');
            const refreshedBalances = await loadData();
            setSelectedStudent(refreshedBalances.find(
                item => item.student.id === selectedStudent.student.id
            ) || null);
            await loadPaymentHistory(selectedStudent.student.id);
        } catch (requestError) {
            console.error('Canteen payment save error:', requestError);
            setError(requestError.response?.data?.message || 'Unable to record the canteen payment.');
        } finally {
            setSaving(false);
        }
    };

    const filteredBalances = useMemo(() => {
        const searchTerm = search.trim().toLowerCase();
        if (!searchTerm) return balances;
        return balances.filter(({ student }) =>
            `${student.firstName} ${student.lastName} ${student.admissionNumber} ${student.gradeLevel || ''}`
                .toLowerCase()
                .includes(searchTerm));
    }, [balances, search]);

    const summary = useMemo(() => balances.reduce((totals, item) => ({
        assessed: totals.assessed + Number(item.assessedAmount || 0),
        paid: totals.paid + Number(item.totalPaid || 0),
        outstanding: totals.outstanding + Number(item.balance || 0)
    }), { assessed: 0, paid: 0, outstanding: 0 }), [balances]);

    const configuredAmount = Number(settings?.canteenFeeAmount || 0);
    const configuredFrequency = formatFrequency(settings?.canteenFeeFrequency);
    const currentPeriod = balances[0]?.billingPeriod || (
        settings?.canteenFeeFrequency?.toUpperCase() === 'TERMLY'
            ? `${settings.currentTerm || 'Current term'} · ${settings.academicYear || 'Current year'}`
            : 'No active students'
    );

    return (
        <div className="container-fluid py-4 bg-light min-vh-100 text-start">
            <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h1 className="h3 fw-bold mb-1"><Utensils className="text-primary me-2" />Canteen Management</h1>
                    <p className="text-muted mb-0">Manage configured canteen fees and record student payments.</p>
                </div>
                <div className="rounded-3 bg-white border shadow-sm px-3 py-2">
                    <span className="text-muted small d-block">Configured charge</span>
                    <strong>{formatCurrency(configuredAmount)} · {configuredFrequency}</strong>
                </div>
            </header>

            {error && <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                <AlertCircle size={18} />{error}
                <button type="button" className="btn-close ms-auto" aria-label="Dismiss error" onClick={() => setError('')} />
            </div>}
            {notice && <div className="alert alert-success" role="status">{notice}</div>}
            {configuredAmount <= 0 && (
                <div className="alert alert-warning">
                    A positive canteen fee is not configured. Update the canteen fee amount in Settings to begin recording payments.
                </div>
            )}

            <div className="row g-3 mb-4">
                {[
                    { label: 'Total assessed', value: summary.assessed },
                    { label: 'Total collected', value: summary.paid },
                    { label: 'Outstanding', value: summary.outstanding }
                ].map(item => (
                    <div className="col-md-4" key={item.label}>
                        <div className="card border-0 shadow-sm rounded-4 p-3 h-100">
                            <span className="small text-muted text-uppercase fw-semibold">{item.label}</span>
                            <strong className="fs-4 mt-1">{formatCurrency(item.value)}</strong>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4 align-items-start">
                <div className={selectedStudent ? 'col-xl-8' : 'col-12'}>
                    <section className="card border-0 shadow-sm rounded-4">
                        <div className="p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div>
                                <h2 className="h5 fw-bold mb-1">Student canteen balances</h2>
                                <span className="small text-muted">{currentPeriod} · {balances.length} active students</span>
                            </div>
                            <label className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                                <span className="input-group-text bg-white"><Search size={16} /></span>
                                <input
                                    type="search"
                                    className="form-control"
                                    aria-label="Search students"
                                    placeholder="Search name, ID, or class"
                                    value={search}
                                    onChange={event => setSearch(event.target.value)}
                                />
                            </label>
                        </div>
                        {loading ? (
                            <div className="text-center py-5"><Loader2 className="animate-spin text-primary" size={28} /></div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th scope="col">Student</th>
                                            <th scope="col">Class</th>
                                            <th scope="col">Assessed</th>
                                            <th scope="col">Paid</th>
                                            <th scope="col">Balance</th>
                                            <th scope="col">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBalances.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center text-muted py-5">
                                                {balances.length ? 'No students match your search.' : 'No active students found.'}
                                            </td></tr>
                                        ) : filteredBalances.map(item => (
                                            <tr key={item.student.id}>
                                                <td>
                                                    <strong>{item.student.firstName} {item.student.lastName}</strong>
                                                    <small className="d-block text-muted">{item.student.admissionNumber}</small>
                                                </td>
                                                <td>{item.student.gradeLevel || '-'}</td>
                                                <td>{formatCurrency(item.assessedAmount)}</td>
                                                <td className="text-success">{formatCurrency(item.totalPaid)}</td>
                                                <td className={Number(item.balance) > 0 ? 'text-danger fw-semibold' : 'text-success fw-semibold'}>
                                                    {formatCurrency(item.balance)}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => selectStudent(item)}
                                                    >
                                                        <Wallet size={15} className="me-1" />
                                                        {Number(item.balance) > 0 ? 'Record payment' : 'History'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                {selectedStudent && (
                    <div className="col-xl-4">
                        <section className="card border-0 shadow-sm rounded-4 mb-4">
                            <div className="p-3 border-bottom">
                                <h2 className="h5 fw-bold mb-1">Record payment</h2>
                                <p className="small text-muted mb-0">
                                    {selectedStudent.student.firstName} {selectedStudent.student.lastName}
                                    {' · Balance: '}{formatCurrency(selectedStudent.balance)}
                                </p>
                            </div>
                            <form className="p-3" onSubmit={submitPayment}>
                                <label className="form-label small fw-semibold" htmlFor="canteen-payment-amount">Amount received</label>
                                <input
                                    id="canteen-payment-amount"
                                    type="number"
                                    className="form-control mb-3"
                                    min="0.01"
                                    max={selectedStudent.balance}
                                    step="0.01"
                                    required
                                    value={paymentAmount}
                                    onChange={event => setPaymentAmount(event.target.value)}
                                />
                                <label className="form-label small fw-semibold" htmlFor="canteen-payment-method">Payment method</label>
                                <select
                                    id="canteen-payment-method"
                                    className="form-select mb-3"
                                    value={paymentMethod}
                                    onChange={event => setPaymentMethod(event.target.value)}
                                >
                                    <option>Cash</option>
                                    <option>Mobile Money</option>
                                    <option>Bank Transfer</option>
                                    <option>Card</option>
                                </select>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-primary flex-grow-1" type="submit"
                                        disabled={saving || Number(selectedStudent.balance) <= 0 || configuredAmount <= 0}>
                                        {saving ? <Loader2 className="animate-spin me-2" size={16} /> : null}
                                        Save payment
                                    </button>
                                    <button className="btn btn-outline-secondary" type="button"
                                        onClick={() => { setSelectedStudent(null); setPaymentHistory([]); }}>
                                        Close
                                    </button>
                                </div>
                            </form>
                        </section>

                        <section className="card border-0 shadow-sm rounded-4">
                            <div className="p-3 border-bottom">
                                <h2 className="h6 fw-bold mb-0">Payment history</h2>
                            </div>
                            {historyLoading ? (
                                <div className="text-center py-4"><Loader2 className="animate-spin text-primary" size={22} /></div>
                            ) : paymentHistory.length === 0 ? (
                                <p className="text-muted small text-center p-3 mb-0">No canteen payments recorded.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {paymentHistory.map(payment => (
                                        <li className="list-group-item px-3 py-2" key={payment.id}>
                                            <div className="d-flex justify-content-between gap-2">
                                                <strong>{formatCurrency(payment.amountPaid)}</strong>
                                                <span className="small text-muted">{payment.datePaid}</span>
                                            </div>
                                            <small className="text-muted">
                                                {formatFrequency(payment.billingFrequency)} · {payment.paymentMethod} · {payment.billingPeriod}
                                            </small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CanteenManagement;
