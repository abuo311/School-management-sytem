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
    const [students, setStudents] = useState([]);
    const [balances, setBalances] = useState([]);
    const [settings, setSettings] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [search, setSearch] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [studentsLoading, setStudentsLoading] = useState(true);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [studentsError, setStudentsError] = useState('');
    const [balanceError, setBalanceError] = useState('');
    const [settingsError, setSettingsError] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadData = useCallback(async () => {
        setStudentsLoading(true);
        setSettingsLoading(true);
        setStudentsError('');
        setBalanceError('');
        setSettingsError('');

        const [studentsResult, balancesResult, settingsResult] = await Promise.allSettled([
            API.get('/students'),
            API.get('/canteen/balances'),
            API.get('/settings')
        ]);

        if (studentsResult.status === 'fulfilled') {
            setStudents(studentsResult.value.data || []);
        } else {
            const requestError = studentsResult.reason;
            console.error('Canteen student list load error:', requestError);
            setStudentsError(requestError.response?.data?.message
                || 'Unable to load students. Check your account permissions and server connection.');
        }

        let nextBalances = null;
        if (balancesResult.status === 'fulfilled') {
            nextBalances = balancesResult.value.data || [];
            setBalances(nextBalances);
        } else {
            const requestError = balancesResult.reason;
            console.error('Canteen balances load error:', requestError);
            const status = requestError.response?.status;
            const message = status === 404
                ? 'Canteen service is not available on the server yet. Deploy the backend canteen updates and try again.'
                : status === 403
                    ? 'Your account does not have permission to view canteen balances. Sign in as an admin or bursar.'
                    : requestError.response?.data?.message || 'Unable to load canteen balances. Student selection is still available; check the server connection and canteen API deployment.';
            setBalanceError(message);
        }

        if (settingsResult.status === 'fulfilled') {
            setSettings(settingsResult.value.data || null);
        } else {
            const requestError = settingsResult.reason;
            console.error('Canteen settings load error:', requestError);
            setSettingsError(requestError.response?.data?.message
                || 'Unable to load the saved canteen settings. Please retry.');
        }

        setStudentsLoading(false);
        setSettingsLoading(false);
        return nextBalances;
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
            const message = requestError.response?.status === 404
                ? 'Canteen payment history is unavailable because the canteen API is not deployed yet.'
                : requestError.response?.data?.message || 'Unable to load this student’s canteen payment history.';
            setError(message);
            setPaymentHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const selectStudent = student => {
        setSelectedStudent(student);
        setPaymentAmount('');
        setNotice('');
        setError('');
        loadPaymentHistory(student.id);
    };

    const selectedBalance = selectedStudent
        ? balances.find(item => item.student.id === selectedStudent.id) || null
        : null;

    const submitPayment = async event => {
        event.preventDefault();
        if (!selectedStudent) return;
        const amount = Number(paymentAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a payment amount greater than zero.');
            return;
        }
        if (selectedBalance && amount > Number(selectedBalance.balance)) {
            setError('Payment cannot exceed the current outstanding balance.');
            return;
        }

        setSaving(true);
        setError('');
        setNotice('');
        try {
            await API.post('/canteen/payments', {
                studentId: selectedStudent.id,
                amountPaid: amount,
                paymentMethod
            });
            setNotice('Canteen payment recorded.');
            setPaymentAmount('');
            const refreshedBalances = await loadData();
            if (refreshedBalances) {
                setBalances(refreshedBalances);
            }
            await loadPaymentHistory(selectedStudent.id);
        } catch (requestError) {
            console.error('Canteen payment save error:', requestError);
            const message = requestError.response?.status === 404
                ? 'Canteen payment service is not available on the server yet. Deploy the backend canteen updates before recording payments.'
                : requestError.response?.data?.message || 'Unable to record the canteen payment.';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = useMemo(() => {
        const searchTerm = search.trim().toLowerCase();
        if (!searchTerm) return students;
        return students.filter(student =>
            `${student.firstName} ${student.lastName} ${student.admissionNumber} ${student.gradeLevel || ''}`
                .toLowerCase()
                .includes(searchTerm));
    }, [students, search]);

    const summary = useMemo(() => balances.reduce((totals, item) => ({
        assessed: totals.assessed + Number(item.assessedAmount || 0),
        paid: totals.paid + Number(item.totalPaid || 0),
        outstanding: totals.outstanding + Number(item.balance || 0)
    }), { assessed: 0, paid: 0, outstanding: 0 }), [balances]);

    const configuredAmount = Number(settings?.canteenFeeAmount ?? 0);
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
                    <strong>{settingsLoading ? 'Loading saved settings…' : `${formatCurrency(configuredAmount)} · ${configuredFrequency}`}</strong>
                </div>
            </header>

            {(studentsError || settingsError || balanceError || error) && <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                <AlertCircle size={18} />
                <span>{[studentsError, settingsError, balanceError, error].filter(Boolean).join(' ')}</span>
                <button type="button" className="btn-close ms-auto" aria-label="Dismiss error" onClick={() => {
                    setStudentsError('');
                    setSettingsError('');
                    setBalanceError('');
                    setError('');
                }} />
            </div>}
            {notice && <div className="alert alert-success" role="status">{notice}</div>}
            {!settingsLoading && settings && configuredAmount <= 0 && (
                <div className="alert alert-warning">
                    A positive canteen fee is not configured. Update the canteen fee amount in Settings to begin recording payments.
                </div>
            )}
            {!settingsLoading && settingsError && (
                <button type="button" className="btn btn-outline-primary btn-sm mb-3" onClick={loadData} disabled={studentsLoading}>
                    Retry loading canteen settings and balances
                </button>
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
                            <strong className="fs-4 mt-1">{balanceError ? '—' : formatCurrency(item.value)}</strong>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4 align-items-start">
                <div className={selectedStudent ? 'col-lg-4' : 'col-12'}>
                    <section className="card border-0 shadow-sm rounded-4">
                        <div className="p-3 border-bottom">
                            <div>
                                <h2 className="h5 fw-bold mb-1">Select a student</h2>
                                <span className="small text-muted">
                                    {balanceError
                                        ? `${students.length} students · payment balances unavailable`
                                        : `${currentPeriod} · ${students.length} active students`}
                                </span>
                            </div>
                            <label className="input-group input-group-sm mt-3">
                                <span className="input-group-text bg-white"><Search size={16} /></span>
                                <input
                                    type="search"
                                    className="form-control"
                                    aria-label="Search students to pay canteen fees"
                                    placeholder="Search students..."
                                    value={search}
                                    onChange={event => setSearch(event.target.value)}
                                />
                            </label>
                        </div>
                        {studentsLoading ? (
                            <div className="text-center py-5"><Loader2 className="animate-spin text-primary" size={28} /></div>
                        ) : (
                            <div className="list-group list-group-flush" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                {filteredStudents.length === 0 ? (
                                    <p className="text-center text-muted py-5 mb-0">
                                        {studentsError ? 'Student list is unavailable.' : students.length ? 'No students match your search.' : 'No active students found.'}
                                    </p>
                                ) : filteredStudents.map(student => (
                                    <button
                                        type="button"
                                        key={student.id}
                                        onClick={() => selectStudent(student)}
                                        className={`list-group-item list-group-item-action border-0 p-3 ${selectedStudent?.id === student.id ? 'active' : ''}`}
                                    >
                                        <span className="d-flex justify-content-between align-items-center gap-2">
                                            <span className="text-start">
                                                <strong className="d-block">{student.firstName} {student.lastName}</strong>
                                                <small className={selectedStudent?.id === student.id ? '' : 'text-muted'}>
                                                    {student.admissionNumber} · {student.gradeLevel || 'Unassigned'}
                                                </small>
                                            </span>
                                            <Wallet size={17} />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {selectedStudent && (
                    <div className="col-lg-8">
                        <section className="card border-0 shadow-sm rounded-4 mb-4">
                            <div className="p-3 border-bottom">
                                <h2 className="h5 fw-bold mb-1">Record canteen payment</h2>
                                <p className="small text-muted mb-0">
                                    {selectedStudent.firstName} {selectedStudent.lastName}
                                    {selectedBalance
                                        ? ` · Balance: ${formatCurrency(selectedBalance.balance)}`
                                        : ` · Configured charge: ${formatCurrency(configuredAmount)} ${configuredFrequency.toLowerCase()}`}
                                </p>
                            </div>
                            <form className="p-3" onSubmit={submitPayment}>
                                <label className="form-label small fw-semibold" htmlFor="canteen-payment-amount">Amount received</label>
                                <input
                                    id="canteen-payment-amount"
                                    type="number"
                                    className="form-control mb-3"
                                    min="0.01"
                                    max={selectedBalance?.balance || undefined}
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
                                        disabled={saving || configuredAmount <= 0}>
                                        {saving ? <Loader2 className="animate-spin me-2" size={16} /> : null}
                                        Save payment
                                    </button>
                                    <button className="btn btn-outline-secondary" type="button"
                                        onClick={() => { setSelectedStudent(null); setPaymentHistory([]); setError(''); }}>
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
