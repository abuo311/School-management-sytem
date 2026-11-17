import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Check, CircleDollarSign, Loader2, Pencil, Plus, Save, X } from 'lucide-react';
import API from '../services/api';

const currentPeriod = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const emptyForm = {
    employeeKey: '',
    basicSalary: '',
    allowances: '0',
    deductions: '0',
    note: ''
};

const money = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2
});

const payrollLoadError = (requestError, endpoint) => {
    const status = requestError.response?.status;
    if (status === 404) {
        return `Payroll endpoint ${endpoint} was not found. Deploy the latest backend, then refresh.`;
    }
    if (status === 401 || status === 403) {
        return `Access denied for ${endpoint} (HTTP ${status}). Sign in with an Admin or Bursar account.`;
    }
    if (!requestError.response) {
        return `Could not reach the backend for ${endpoint}. Check that the backend is running and accessible.`;
    }
    return requestError.response.data?.message || `Payroll request ${endpoint} failed (HTTP ${status}).`;
};

const Payroll = () => {
    const [period, setPeriod] = useState(currentPeriod);
    const [employees, setEmployees] = useState([]);
    const [records, setRecords] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadPayroll = useCallback(async () => {
        setLoading(true);
        setError('');
        setEmployees([]);
        setRecords([]);
        const [employeeResult, payrollResult] = await Promise.allSettled([
            API.get('/payroll/employees'),
            API.get('/payroll', { params: { year: Number(period.slice(0, 4)), month: Number(period.slice(5, 7)) } })
        ]);
        const errors = [];
        if (employeeResult.status === 'fulfilled') {
            setEmployees(employeeResult.value.data || []);
        } else {
            errors.push(payrollLoadError(employeeResult.reason, '/payroll/employees'));
        }
        if (payrollResult.status === 'fulfilled') {
            setRecords(payrollResult.value.data || []);
        } else {
            errors.push(payrollLoadError(payrollResult.reason, '/payroll'));
        }
        setError(errors.join(' '));
        setLoading(false);
    }, [period]);

    useEffect(() => {
        loadPayroll();
    }, [loadPayroll]);

    const totals = useMemo(() => records.reduce((result, record) => ({
        basic: result.basic + Number(record.basicSalary),
        allowances: result.allowances + Number(record.allowances),
        deductions: result.deductions + Number(record.deductions),
        net: result.net + Number(record.netPay),
        paid: result.paid + (record.status === 'PAID' ? Number(record.netPay) : 0),
        pending: result.pending + (record.status === 'PENDING' ? Number(record.netPay) : 0)
    }), { basic: 0, allowances: 0, deductions: 0, net: 0, paid: 0, pending: 0 }), [records]);

    const changeForm = (field, value) => {
        setForm(current => ({ ...current, [field]: value }));
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    const saveRecord = async event => {
        event.preventDefault();
        const [year, month] = period.split('-').map(Number);
        const [employeeType, employeeId] = form.employeeKey.split('-');
        const payload = {
            employeeType,
            employeeId: Number(employeeId),
            year,
            month,
            basicSalary: Number(form.basicSalary),
            allowances: Number(form.allowances),
            deductions: Number(form.deductions),
            note: form.note
        };
        if (!payload.employeeType || !Number.isFinite(payload.employeeId) || !Number.isFinite(payload.basicSalary)
            || !Number.isFinite(payload.allowances) || !Number.isFinite(payload.deductions)) {
            setError('Choose an employee and enter valid payroll amounts.');
            return;
        }
        if (payload.deductions > payload.basicSalary + payload.allowances) {
            setError('Deductions cannot exceed basic salary plus allowances.');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');
        try {
            if (editingId) {
                await API.put(`/payroll/${editingId}`, payload);
                setSuccess('Payroll record updated.');
            } else {
                await API.post('/payroll', payload);
                setSuccess('Payroll record added.');
            }
            resetForm();
            await loadPayroll();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to save payroll record.');
        } finally {
            setSaving(false);
        }
    };

    const editRecord = record => {
        setForm({
            employeeKey: `${record.employeeType}-${record.employeeId}`,
            basicSalary: String(record.basicSalary),
            allowances: String(record.allowances),
            deductions: String(record.deductions),
            note: record.note || ''
        });
        setEditingId(record.id);
        setError('');
        setSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const markAsPaid = async id => {
        const record = records.find(item => item.id === id);
        if (!record || !window.confirm(
            `Record payment of ${money.format(Number(record.netPay))} to ${record.staffName} via ${paymentMethod}?`
        )) return;
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await API.post(`/payroll/${id}/pay`, { paymentMethod });
            setSuccess('Payment recorded.');
            await loadPayroll();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to record payment.');
        } finally {
            setSaving(false);
        }
    };

    const selectedPeriod = new Date(`${period}-01T00:00:00`);
    const periodLabel = selectedPeriod.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });

    return (
        <div className="container-fluid py-4 text-start">
            <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h3 className="fw-bold mb-1"><Banknote size={25} className="me-2 text-success" />Payroll</h3>
                    <p className="text-muted small mb-0">Manage monthly salaries, allowances and staff payments</p>
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <label className="visually-hidden" htmlFor="payroll-period">Payroll month</label>
                    <input id="payroll-period" type="month" className="form-control" value={period}
                           onChange={event => {
                               if (event.target.value) setPeriod(event.target.value);
                           }} />
                    <label className="visually-hidden" htmlFor="payroll-payment-method">Payment method</label>
                    <select id="payroll-payment-method" className="form-select" value={paymentMethod}
                            onChange={event => setPaymentMethod(event.target.value)}>
                        <option>Bank Transfer</option>
                        <option>Mobile Money</option>
                        <option>Cash</option>
                        <option>Cheque</option>
                        <option>Other</option>
                    </select>
                </div>
            </header>

            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
            {success && <div className="alert alert-success py-2" role="status">{success}</div>}

            <div className="row g-3 mb-4">
                {[
                    { label: 'Total net payroll', value: totals.net, icon: <CircleDollarSign size={22} />, color: 'primary' },
                    { label: 'Paid', value: totals.paid, icon: <Check size={22} />, color: 'success' },
                    { label: 'Pending', value: totals.pending, icon: <Banknote size={22} />, color: 'warning' }
                ].map(item => (
                    <div className="col-md-4" key={item.label}>
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="small text-muted fw-semibold">{item.label} · {periodLabel}</div>
                                    <div className="fs-4 fw-bold mt-1">{money.format(item.value)}</div>
                                </div>
                                <span className={`text-${item.color}`}>{item.icon}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <form className="card border-0 shadow-sm mb-4" onSubmit={saveRecord}>
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">{editingId ? 'Edit payroll record' : 'Add payroll record'}</h5>
                    {editingId && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetForm}><X size={15} className="me-1" />Cancel edit</button>}
                </div>
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-3 col-md-6">
                            <label className="form-label fw-semibold" htmlFor="payroll-employee">Employee</label>
                            <select id="payroll-employee" className="form-select" value={form.employeeKey}
                                    onChange={event => changeForm('employeeKey', event.target.value)}
                                    disabled={Boolean(editingId)} required>
                                <option value="">Select an employee</option>
                                {employees.map(employee => (
                                    <option key={`${employee.employeeType}-${employee.employeeId}`}
                                            value={`${employee.employeeType}-${employee.employeeId}`}>
                                        {employee.fullName} · {employee.position}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-lg-2 col-md-6">
                            <label className="form-label fw-semibold" htmlFor="payroll-basic">Basic salary (GHS)</label>
                            <input id="payroll-basic" className="form-control" type="number" min="0" step="0.01"
                                   value={form.basicSalary} onChange={event => changeForm('basicSalary', event.target.value)} required />
                        </div>
                        <div className="col-lg-2 col-md-6">
                            <label className="form-label fw-semibold" htmlFor="payroll-allowances">Allowances (GHS)</label>
                            <input id="payroll-allowances" className="form-control" type="number" min="0" step="0.01"
                                   value={form.allowances} onChange={event => changeForm('allowances', event.target.value)} required />
                        </div>
                        <div className="col-lg-2 col-md-6">
                            <label className="form-label fw-semibold" htmlFor="payroll-deductions">Deductions (GHS)</label>
                            <input id="payroll-deductions" className="form-control" type="number" min="0" step="0.01"
                                   value={form.deductions} onChange={event => changeForm('deductions', event.target.value)} required />
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <label className="form-label fw-semibold" htmlFor="payroll-note">Note</label>
                            <input id="payroll-note" className="form-control" maxLength="500" value={form.note}
                                   onChange={event => changeForm('note', event.target.value)} placeholder="Optional" />
                        </div>
                        <div className="col-12 d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <span className="small text-muted">
                                Net pay: <strong>{money.format(Math.max(0, Number(form.basicSalary || 0) + Number(form.allowances || 0) - Number(form.deductions || 0)))}</strong>
                            </span>
                            <button type="submit" className="btn btn-dark d-flex align-items-center gap-2" disabled={saving || loading || employees.length === 0}>
                                {saving ? <Loader2 size={17} className="animate-spin" /> : editingId ? <Save size={17} /> : <Plus size={17} />}
                                {editingId ? 'Update record' : 'Add to payroll'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            <section className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">{periodLabel} payroll</h5>
                    <span className="badge bg-light text-dark border">{records.length} employee{records.length === 1 ? '' : 's'}</span>
                </div>
                {loading ? (
                    <div className="p-5 text-center text-muted"><Loader2 size={20} className="animate-spin me-2" />Loading payroll...</div>
                ) : records.length === 0 ? (
                    <div className="p-5 text-center text-muted">No payroll records for {periodLabel} yet.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-3">Employee</th>
                                    <th>Basic pay</th>
                                    <th>Allowances</th>
                                    <th>Deductions</th>
                                    <th>Net pay</th>
                                    <th>Status / payment</th>
                                    <th className="text-end pe-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(record => (
                                    <tr key={record.id}>
                                        <td className="ps-3">
                                            <div className="fw-semibold">{record.staffName}</div>
                                            <small className="text-muted">{record.position}</small>
                                            {record.note && <div className="small text-muted">{record.note}</div>}
                                        </td>
                                        <td>{money.format(Number(record.basicSalary))}</td>
                                        <td>{money.format(Number(record.allowances))}</td>
                                        <td>{money.format(Number(record.deductions))}</td>
                                        <td className="fw-bold">{money.format(Number(record.netPay))}</td>
                                        <td>
                                            <span className={`badge ${record.status === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                {record.status}
                                            </span>
                                            {record.status === 'PAID' && (
                                                <div className="small text-muted mt-1">{record.paymentMethod} · {record.paymentDate}</div>
                                            )}
                                        </td>
                                        <td className="text-end pe-3">
                                            {record.status === 'PENDING' ? (
                                                <div className="d-flex justify-content-end gap-2">
                                                    <button type="button" className="btn btn-sm btn-outline-secondary"
                                                            onClick={() => editRecord(record)} disabled={saving}>
                                                        <Pencil size={15} className="me-1" />Edit
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-success"
                                                            onClick={() => markAsPaid(record.id)} disabled={saving}>
                                                        <Check size={15} className="me-1" />Mark paid
                                                    </button>
                                                </div>
                                            ) : <span className="small text-muted">Complete</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="table-light fw-semibold">
                                <tr>
                                    <td className="ps-3">Total</td>
                                    <td>{money.format(totals.basic)}</td>
                                    <td>{money.format(totals.allowances)}</td>
                                    <td>{money.format(totals.deductions)}</td>
                                    <td>{money.format(totals.net)}</td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Payroll;
