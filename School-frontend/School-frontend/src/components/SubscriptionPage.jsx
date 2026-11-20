import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import API from '../services/api';

const formatGhs = amount => `GHS ${Number(amount).toLocaleString('en-GH')}`;

export const SubscriptionGate = ({ children }) => {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let isCurrent = true;
        API.get('/subscription/status')
            .then(response => {
                if (isCurrent) setStatus(response.data);
            })
            .catch(() => {
                if (isCurrent) setError('Unable to check the school subscription. Check your connection and try again.');
            });
        return () => { isCurrent = false; };
    }, [retry]);

    if (!sessionStorage.getItem('token')) return <Navigate to="/login" replace />;
    if (error) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
                <div className="card border-0 shadow-sm rounded-4 p-4 text-center" style={{ maxWidth: 480 }}>
                    <h1 className="h5 fw-bold">Subscription check failed</h1>
                    <p className="text-muted">{error}</p>
                    <button className="btn btn-dark" onClick={() => { setError(''); setStatus(null); setRetry(value => value + 1); }}>
                        Try again
                    </button>
                </div>
            </div>
        );
    }
    if (!status) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary" role="status" aria-label="Checking subscription" />
            </div>
        );
    }
    if (status.status !== 'ACTIVE' && status.status !== 'TRIALING') {
        return <Navigate to="/subscription" replace />;
    }
    return children;
};

const SubscriptionPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState(null);
    const [plans, setPlans] = useState([]);
    const [email, setEmail] = useState(() => {
        const username = sessionStorage.getItem('userName') || '';
        return username.includes('@') ? username : '';
    });
    const [loading, setLoading] = useState(true);
    const [checkoutPlan, setCheckoutPlan] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verificationAttempt, setVerificationAttempt] = useState(0);
    const handledReference = useRef('');
    const isAdmin = sessionStorage.getItem('userRole') === 'ADMIN';

    const loadSubscription = useCallback(async () => {
        const [statusResponse, plansResponse] = await Promise.all([
            API.get('/subscription/status'),
            API.get('/subscription/plans')
        ]);
        setStatus(statusResponse.data);
        setPlans(plansResponse.data);
    }, []);

    useEffect(() => {
        let isCurrent = true;
        loadSubscription()
            .catch(() => {
                if (isCurrent) setError('Unable to load subscription details. Please try again.');
            })
            .finally(() => {
                if (isCurrent) setLoading(false);
            });
        return () => { isCurrent = false; };
    }, [loadSubscription]);

    const reference = searchParams.get('reference') || searchParams.get('trxref');
    useEffect(() => {
        if (!reference || handledReference.current === `${reference}:${verificationAttempt}`) return;
        handledReference.current = `${reference}:${verificationAttempt}`;
        setVerifying(true);
        setError('');
        let verified = false;
        API.post('/subscription/verify', { reference })
            .then(async response => {
                if (response.data?.verified) {
                    verified = true;
                    setNotice('Payment confirmed. Your subscription is active.');
                    await loadSubscription();
                } else {
                    setError('Paystack has not confirmed this payment yet. Please try verification again shortly.');
                }
            })
            .catch(requestError => {
                setError(requestError.response?.data?.message || 'Payment verification failed. Please try again.');
            })
            .finally(() => {
                setVerifying(false);
                if (verified) navigate('/subscription', { replace: true });
            });
    }, [reference, verificationAttempt, loadSubscription, navigate]);

    const startCheckout = async planCode => {
        setCheckoutPlan(planCode);
        setError('');
        setNotice('');
        try {
            const response = await API.post('/subscription/checkout', { planCode, email });
            window.location.assign(response.data.authorizationUrl);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to start checkout. Please try again.');
            setCheckoutPlan('');
        }
    };

    const signOut = () => {
        sessionStorage.clear();
        navigate('/login', { replace: true });
    };

    if (loading || verifying) {
        return (
            <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center gap-3 bg-light">
                <div className="spinner-border text-primary" role="status" aria-label="Loading subscription" />
                <span className="text-muted">{verifying ? 'Confirming payment…' : 'Loading subscription…'}</span>
            </div>
        );
    }

    return (
        <main className="min-vh-100 bg-light py-5 px-3">
            <div className="container" style={{ maxWidth: 1060 }}>
                <header className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-2">
                        <ShieldCheck className="text-primary" size={28} aria-hidden="true" />
                        <span className="fw-bold">School subscription</span>
                    </div>
                    <button className="btn btn-outline-secondary btn-sm" onClick={signOut}>Sign out</button>
                </header>

                {notice && <div className="alert alert-success">{notice}</div>}
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                {error && reference && (
                    <button
                        type="button"
                        className="btn btn-outline-danger mb-4"
                        onClick={() => setVerificationAttempt(value => value + 1)}
                    >
                        Retry payment verification
                    </button>
                )}

                <section className="card border-0 shadow-sm rounded-4 p-4 p-md-5 mb-4">
                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                        <div>
                            <span className={`badge ${status?.status === 'TRIALING' ? 'text-bg-primary' : status?.status === 'ACTIVE' ? 'text-bg-success' : 'text-bg-danger'}`}>
                                {status?.status || 'UNKNOWN'}
                            </span>
                            <h1 className="h3 fw-bold mt-3 mb-2">
                                {status?.status === 'TRIALING' ? 'Your free trial is active' : status?.status === 'ACTIVE' ? status.planName : 'Choose a plan to continue'}
                            </h1>
                            <p className="text-muted mb-0">
                                {status?.status === 'TRIALING'
                                    ? 'Enjoy one month of access, then choose a plan to keep using the school portal.'
                                    : status?.status === 'ACTIVE'
                                        ? 'Your school subscription is active.'
                                        : 'The free trial or paid subscription has ended. Select a plan below to restore access.'}
                            </p>
                            {status?.accessEndsAt && (
                                <p className="small text-muted mt-2 mb-0">
                                    {status.status === 'TRIALING' ? 'Trial ends' : 'Access ends'}: {new Date(status.accessEndsAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        {status?.status === 'ACTIVE' && (
                            <div className="d-flex align-items-start gap-2 text-success">
                                <CheckCircle2 size={20} aria-hidden="true" />
                                <span className="small fw-semibold">All school features are available</span>
                            </div>
                        )}
                    </div>
                </section>

                <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-3">
                    <div>
                        <h2 className="h4 fw-bold mb-1">Select your subscription</h2>
                        <p className="text-muted mb-0">Pay securely with Paystack. Prices are in Ghana cedis.</p>
                    </div>
                </div>

                {!isAdmin && (
                    <div className="alert alert-warning">Only a school administrator can purchase or renew a subscription.</div>
                )}
                {!status?.paystackConfigured && (
                    <div className="alert alert-warning">Online checkout is not configured. Please contact the system administrator.</div>
                )}

                <label className="form-label fw-semibold" htmlFor="subscription-email">Receipt email</label>
                <input
                    id="subscription-email"
                    type="email"
                    className="form-control mb-4"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="school@example.com"
                    required
                    disabled={!isAdmin}
                />

                <div className="row g-3">
                    {plans.map(plan => (
                        <div className="col-md-6" key={plan.code}>
                            <article className="card h-100 border-0 shadow-sm rounded-4 p-4">
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div>
                                        <h3 className="h5 fw-bold mb-1">{plan.name}</h3>
                                        <p className="text-muted mb-0">{plan.duration} of access</p>
                                    </div>
                                    <span className="badge text-bg-light border">{plan.code.startsWith('PREMIUM') ? 'Premium' : 'Standard'}</span>
                                </div>
                                <div className="display-6 fw-bold my-4">{formatGhs(plan.amount)}</div>
                                <p className="small text-muted flex-grow-1 mb-4">
                                    {plan.durationMonths === 12 ? 'One academic year (12 months).' : 'Four months of school portal access.'}
                                </p>
                                <button
                                    type="button"
                                    className={`btn ${plan.code.startsWith('PREMIUM') ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center justify-content-center gap-2`}
                                    disabled={!isAdmin || !status?.paystackConfigured || !email || Boolean(checkoutPlan)}
                                    onClick={() => startCheckout(plan.code)}
                                >
                                    {checkoutPlan === plan.code
                                        ? <span className="spinner-border spinner-border-sm" role="status" aria-label="Starting checkout" />
                                        : <CreditCard size={18} aria-hidden="true" />}
                                    {checkoutPlan === plan.code ? 'Connecting to Paystack…' : 'Continue to payment'}
                                </button>
                            </article>
                        </div>
                    ))}
                </div>

                <p className="small text-muted text-center mt-4 mb-0">
                    Payments are verified by the backend before subscription access is updated.
                </p>
                {status?.status === 'ACTIVE' && (
                    <div className="text-center mt-4">
                        <button className="btn btn-link" onClick={() => navigate('/dashboard')}>Return to the school portal</button>
                    </div>
                )}
            </div>
        </main>
    );
};

export default SubscriptionPage;
