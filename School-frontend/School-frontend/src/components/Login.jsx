import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import {
    Lock, User, ShieldAlert, LogIn, GraduationCap,
    Eye, EyeOff, Mail, Phone, HelpCircle, X
} from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSupport, setShowSupport] = useState(false);

    // NEW: State for school settings and loading flag
    const [schoolInfo, setSchoolInfo] = useState({ name: '', logo: null });
    const [isFetchingBranding, setIsFetchingBranding] = useState(true);

    const goldColor = '#d4af37';
    const darkBg = '#1a1a1a';

    useEffect(() => {
        const fetchSchoolSettings = async () => {
            try {
                const res = await API.get('/settings');
                if (res.data) {
                    setSchoolInfo({
                        name: res.data.schoolName || 'EDUMANAGER',
                        logo: res.data.logoUrl || null
                    });
                }
            } catch (err) {
                console.error("Could not load school branding");
                setSchoolInfo({ name: 'EDUMANAGER', logo: null });
            } finally {
                // Remove loading state once API call finishes
                setIsFetchingBranding(false);
            }
        };
        fetchSchoolSettings();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            sessionStorage.clear();
            const res = await API.post('/auth/login', credentials);
            if (res.data && res.data.token) {
                sessionStorage.setItem('token', res.data.token);
                sessionStorage.setItem('userRole', res.data.role);
                sessionStorage.setItem('userName', res.data.username);
                sessionStorage.setItem('isAuthenticated', 'true');
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            setError("Invalid username or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3 position-relative" style={{ backgroundColor: '#f4f4f4' }}>
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ maxWidth: '950px', width: '100%', minHeight: '550px' }}>
                <div className="row g-0 h-100">

                    {/* LEFT SIDE: BRANDING */}
                    <div className="col-lg-6 d-none d-lg-flex flex-column align-items-center justify-content-center text-white p-5 position-relative"
                         style={{ backgroundColor: darkBg }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 0% 0%, ${goldColor}11 0%, transparent 50%)` }}></div>

                        {/* Logo with Loading Spinner */}
                        <div className={`mb-4 p-4 rounded-circle border border-2 shadow-lg d-flex align-items-center justify-content-center bg-white overflow-hidden transition-all ${isFetchingBranding ? 'opacity-50' : 'opacity-100'}`}
                             style={{ borderColor: goldColor, width: '140px', height: '140px', transition: '0.4s ease' }}>
                            {isFetchingBranding ? (
                                <div className="spinner-border text-warning" style={{ width: '2rem', height: '2rem' }}></div>
                            ) : schoolInfo.logo ? (
                                <img src={schoolInfo.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <GraduationCap size={60} style={{ color: goldColor }}/>
                            )}
                        </div>

                        {/* DYNAMIC SCHOOL NAME with Fade-in */}
                        <div className={`text-center px-3 transition-all ${isFetchingBranding ? 'opacity-0' : 'opacity-100'}`} style={{ transition: '0.6s ease' }}>
                            <h1 className="fw-black display-6 mb-2 text-uppercase" style={{ letterSpacing: '2px', color: goldColor }}>
                                {schoolInfo.name}
                            </h1>
                            <div className="mb-4 mx-auto" style={{ height: '3px', width: '50px', backgroundColor: goldColor }}></div>
                            <p className="lead opacity-75 small text-uppercase fw-bold">Institutional Excellence Portal</p>
                        </div>
                    </div>

                    {/* RIGHT SIDE: FORM */}
                    <div className="col-lg-6 bg-white p-4 p-md-5 d-flex flex-column justify-content-center">
                        <div className="mb-4 text-center text-lg-start">
                            <h3 className="fw-black text-dark mb-1 text-uppercase" style={{ fontSize: '1.5rem' }}>Account Login</h3>
                            <p className="text-muted small fw-bold">Enter authorized credentials to continue</p>
                        </div>

                        {error && (
                            <div className="alert border-0 d-flex align-items-center mb-4 py-3 rounded-3 shadow-sm" style={{ backgroundColor: '#fff5f5', color: '#c53030' }}>
                                <ShieldAlert size={18} className="me-2"/>
                                <span className="small fw-bold">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleLogin}>
                            <div className="mb-3">
                                <label className="form-label small fw-black text-muted text-uppercase" style={{ fontSize: '0.7rem' }}>Username</label>
                                <div className="input-group border-2 rounded-3 overflow-hidden shadow-sm">
                                    <span className="input-group-text bg-white border-end-0 text-muted px-3"><User size={18} style={{ color: goldColor }}/></span>
                                    <input type="text" className="form-control bg-white border-start-0 py-3 shadow-none fw-bold" placeholder="ADMIN NAME" value={credentials.username} onChange={(e) => setCredentials({...credentials, username: e.target.value})} required />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label small fw-black text-muted text-uppercase" style={{ fontSize: '0.7rem' }}>Access Key</label>
                                <div className="input-group border-2 rounded-3 overflow-hidden shadow-sm">
                                    <span className="input-group-text bg-white border-end-0 text-muted px-3"><Lock size={18} style={{ color: goldColor }}/></span>
                                    <input type={showPassword ? "text" : "password"} className="form-control bg-white border-x-0 py-3 shadow-none fw-bold" placeholder="••••••••" value={credentials.password} onChange={(e) => setCredentials({...credentials, password: e.target.value})} required />
                                    <button type="button" className="input-group-text bg-white border-start-0 text-muted px-3" onClick={() => setShowPassword(!showPassword)} style={{ borderLeft: 'none' }}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                                </div>
                            </div>

                            <button className="btn btn-dark w-100 py-3 fw-black rounded-3 shadow d-flex align-items-center justify-content-center gap-2 text-uppercase"
                                    disabled={loading || isFetchingBranding}>
                                {loading ? <span className="spinner-border spinner-border-sm" style={{ color: goldColor }}></span> : <><LogIn size={20} style={{ color: goldColor }} /><span>Sign In</span></>}
                            </button>
                        </form>

                        <div className="text-center mt-5 border-top pt-4">
                            <p className="text-muted fw-bold mb-1" style={{ fontSize: '0.65rem' }}>RESTRICTED ACCESS AREA</p>
                            <button
                                className="btn btn-link btn-sm text-decoration-none fw-black p-0 text-uppercase d-flex align-items-center gap-2 mx-auto"
                                style={{ color: darkBg, fontSize: '0.75rem' }}
                                onClick={() => setShowSupport(true)}
                            >
                                <HelpCircle size={14} style={{ color: goldColor }}/> System Support & Help
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* SUPPORT MODAL OVERLAY */}
            {showSupport && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }}>
                    <div className="card border-0 rounded-4 shadow-lg" style={{ maxWidth: '450px', width: '100%', overflow: 'hidden' }}>
                        <div className="p-4 text-white d-flex justify-content-between align-items-center" style={{ backgroundColor: darkBg }}>
                            <h6 className="m-0 fw-black text-uppercase" style={{ letterSpacing: '1px' }}>Technical Support</h6>
                            <button className="btn btn-link text-white p-0" onClick={() => setShowSupport(false)}><X size={20}/></button>
                        </div>
                        <div className="p-4 bg-white">
                            <div className="d-flex align-items-start gap-3 mb-4">
                                <div className="p-2 rounded bg-light"><Mail size={20} style={{ color: goldColor }}/></div>
                                <div>
                                    <p className="mb-0 small fw-bold text-muted">EMAIL INQUIRIES</p>
                                    <p className="mb-0 fw-black">abuobernard@gmail.com</p>
                                </div>
                            </div>
                            <div className="d-flex align-items-start gap-3 mb-4">
                                <div className="p-2 rounded bg-light"><Phone size={20} style={{ color: goldColor }}/></div>
                                <div>
                                    <p className="mb-0 small fw-bold text-muted">HELPLINE (GH)</p>
                                    <p className="mb-0 fw-black">+233 0558770252</p>
                                    <p className="mb-0 fw-black">+233 0209943966</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-light text-center">
                            <button className="btn btn-dark btn-sm w-100 fw-bold rounded-pill py-2" onClick={() => setShowSupport(false)}>Close Window</button>
                        </div>
                    </div>
                </div>
            )}
            <p className="mt-4 text-muted small opacity-50 fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>
                &copy; 2026 {schoolInfo.name || 'EDUMANAGER'} &bull; v1.0.4
            </p>
        </div>
    );
};

export default Login;