import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Plus, Trash2, Wallet, X } from 'lucide-react';
import API from '../services/api';

const categories = [
    'Utilities',
    'School supplies',
    'Maintenance',
    'Transport',
    'Food',
    'Activities',
    'Other'
];

const todayLocal = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const emptyExpense = () => ({
    category: '',
    description: '',
    amount: '',
    expenseDate: todayLocal(),
    paymentMethod: 'Cash',
    note: ''
});

const formatCurrency = amount => `₵${Number(amount || 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;

const getErrorMessage = (requestError, fallback) =>
    requestError.response?.data?.message || fallback;

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [account, setAccount] = useState(null);
    const [form, setForm] = useState(emptyExpense);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [expensesResponse, accountResponse] = await Promise.all([
                API.get('/expenses'),
                API.get('/expenses/account-summary')
            ]);
            setExpenses(expensesResponse.data || []);
            setAccount(accountResponse.data);
            return true;
        } catch (requestError) {
            console.error('Expense data load error:', requestError);
            setError(getErrorMessage(requestError, 'Unable to load expenses and account totals.'));
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const resetForm = () => {
        setForm(emptyExpense());
        setEditingId(null);
    };

    const submitExpense = async event => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const payload = { ...form, amount: Number(form.amount) };
            if (editingId) {
                await API.put(`/expenses/${editingId}`, payload);
                setNotice('Expense updated and account balance recalculated.');
            } else {
                await API.post('/expenses', payload);
                setNotice('Expense recorded and deducted from the account.');
            }
            resetForm();
            await loadData();
        } catch (requestError) {
            console.error('Expense save error:', requestError);
            setError(getErrorMessage(requestError, 'Unable to save this expense.'));
        } finally {
            setSaving(false);
        }
    };

    const editExpense = expense => {
        setEditingId(expense.id);
        setForm({
            category: expense.category,
            description: expense.description,
            amount: String(expense.amount),
            expenseDate: expense.expenseDate,
            paymentMethod: expense.paymentMethod,
            note: expense.note || ''
        });
        setError('');
        setNotice('');
    };

    const deleteExpense = async expense => {
        if (!window.confirm(`Delete the expense "${expense.description}"? The account balance will be recalculated.`)) return;
        setSaving(true);
        setError('');
        setNotice('');
        try {
            await API.delete(`/expenses/${expense.id}`);
            setNotice('Expense deleted and account balance recalculated.');
            await loadData();
            if (editingId === expense.id) resetForm();
        } catch (requestError) {
            console.error('Expense delete error:', requestError);
            setError(getErrorMessage(requestError, 'Unable to delete this expense.'));
        } finally {
            setSaving(false);
        }
    };

    const updateField = event => {
        const { name, value } = event.target;
        setForm(current => ({ ...current, [name]: value }));
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100 text-start">
            <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h1 className="h3 fw-bold mb-1"><Wallet className="text-primary me-2" />Expenses</h1>
                    <p className="text-muted mb-0">Record school spending and track the available account balance.</p>
                </div>
                <div className="card border-0 shadow-sm rounded-4 px-4 py-3">
                    <span className="small text-muted text-uppercase fw-semibold">Available account balance</span>
                    <strong className={`fs-4 ${Number(account?.availableBalance) < 0 ? 'text-danger' : 'text-success'}`}>
                        {account ? formatCurrency(account.availableBalance) : '—'}
                    </strong>
                </div>
            </header>

            {error && <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                <AlertCircle size={18} /><span>{error}</span>
            </div>}
            {notice && <div className="alert alert-success" role="status">{notice}</div>}

            {account && (
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total income', value: account.totalIncome },
                        { label: 'Recorded expenses', value: account.recordedExpenses },
                        { label: 'Payroll paid', value: account.payrollPaid }
                    ].map(item => (
                        <div className="col-md-4" key={item.label}>
                            <div className="card border-0 shadow-sm rounded-4 p-3 h-100">
                                <span className="small text-muted text-uppercase fw-semibold">{item.label}</span>
                                <strong className="fs-4 mt-1">{formatCurrency(item.value)}</strong>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="alert alert-info py-2">
                Income includes collected school and canteen fees. Paid payroll is included automatically; do not enter payroll again as a manual expense.
            </div>

            <div className="row g-4 align-items-start">
                <div className="col-xl-4">
                    <section className="card border-0 shadow-sm rounded-4">
                        <div className="card-body p-4">
                            <h2 className="h5 fw-bold mb-3">{editingId ? 'Edit expense' : 'Record an expense'}</h2>
                            <form onSubmit={submitExpense} className="d-grid gap-3">
                                <div>
                                    <label className="form-label fw-semibold" htmlFor="expense-category">Category</label>
                                    <select id="expense-category" name="category" className="form-select" value={form.category}
                                            onChange={updateField} required>
                                        <option value="">Select category</option>
                                        {categories.map(category => <option key={category} value={category}>{category}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label fw-semibold" htmlFor="expense-description">Description</label>
                                    <input id="expense-description" name="description" className="form-control" value={form.description}
                                           onChange={updateField} maxLength="200" required />
                                </div>
                                <div className="row g-3">
                                    <div className="col-sm-6">
                                        <label className="form-label fw-semibold" htmlFor="expense-amount">Amount (₵)</label>
                                        <input id="expense-amount" name="amount" type="number" className="form-control"
                                               value={form.amount} onChange={updateField} min="0.01" step="0.01" required />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="form-label fw-semibold" htmlFor="expense-date">Date spent</label>
                                        <input id="expense-date" name="expenseDate" type="date" className="form-control"
                                               value={form.expenseDate} onChange={updateField} required />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label fw-semibold" htmlFor="expense-payment-method">Payment method</label>
                                    <select id="expense-payment-method" name="paymentMethod" className="form-select"
                                            value={form.paymentMethod} onChange={updateField} required>
                                        <option>Cash</option>
                                        <option>Bank transfer</option>
                                        <option>Mobile money</option>
                                        <option>Cheque</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label fw-semibold" htmlFor="expense-note">Note (optional)</label>
                                    <textarea id="expense-note" name="note" className="form-control" value={form.note}
                                              onChange={updateField} rows="2" maxLength="500" />
                                </div>
                                <div className="d-flex gap-2">
                                    <button type="submit" className="btn btn-primary flex-grow-1" disabled={saving}>
                                        {saving ? <Loader2 size={17} className="animate-spin me-1" /> : <Plus size={17} className="me-1" />}
                                        {editingId ? 'Save changes' : 'Record expense'}
                                    </button>
                                    {editingId && <button type="button" className="btn btn-outline-secondary" onClick={resetForm} disabled={saving}>
                                        <X size={17} className="me-1" />Cancel
                                    </button>}
                                </div>
                            </form>
                        </div>
                    </section>
                </div>

                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                            <h2 className="h5 fw-bold mb-0">Expense history</h2>
                            <span className="badge text-bg-light">{expenses.length} records</span>
                        </div>
                        {loading ? (
                            <div className="py-5 text-center"><Loader2 className="animate-spin" /> Loading expenses...</div>
                        ) : expenses.length === 0 ? (
                            <div className="py-5 text-center text-muted">No expenses have been recorded.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">Date / Description</th>
                                            <th>Category</th>
                                            <th>Payment</th>
                                            <th className="text-end">Amount</th>
                                            <th className="text-end pe-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.map(expense => (
                                            <tr key={expense.id}>
                                                <td className="ps-3">
                                                    <strong className="d-block">{expense.description}</strong>
                                                    <small className="text-muted">{expense.expenseDate}{expense.note ? ` · ${expense.note}` : ''}</small>
                                                </td>
                                                <td>{expense.category}</td>
                                                <td>{expense.paymentMethod}</td>
                                                <td className="text-end fw-semibold">{formatCurrency(expense.amount)}</td>
                                                <td className="text-end pe-3">
                                                    <button type="button" className="btn btn-sm btn-outline-primary me-1"
                                                            onClick={() => editExpense(expense)} disabled={saving} aria-label={`Edit ${expense.description}`}>
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-outline-danger"
                                                            onClick={() => deleteExpense(expense)} disabled={saving} aria-label={`Delete ${expense.description}`}>
                                                        <Trash2 size={15} />
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
            </div>
        </div>
    );
};

export default Expenses;
