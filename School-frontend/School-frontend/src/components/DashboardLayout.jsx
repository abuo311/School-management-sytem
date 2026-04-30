import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';
import {
    LayoutDashboard, Users, UserCog, BookOpen,
    Settings, LogOut, Home, CalendarCheck,
    FileText, PenTool, Wallet, AlertTriangle, BarChart3, Menu, X,
    ShieldPlus, UserCircle, User, LayoutGrid, TrendingUp
} from 'lucide-react';
import '../styles/Dashboard.css';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState({ name: 'EduManager', logo: null });

    const goldColor = '#d4af37';
    const darkBg = '#1a1a1a';

    const userName = sessionStorage.getItem('fullName') || sessionStorage.getItem('userName') || 'User';
    const userRole = sessionStorage.getItem('userRole') || 'TEACHER';
    const loginID = sessionStorage.getItem('userName');

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await API.get('/settings');
                if (res.data) {
                    setSchoolInfo({
                        name: res.data.schoolName || 'EduManager',
                        logo: res.data.logoUrl || null
                    });
                }
            } catch (err) {
                console.error("Dashboard branding load failed");
            }
        };
        fetchBranding();
    }, []);

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/login');
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
    };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    // Helper to format path for header title
    const getPageTitle = () => {
        const path = location.pathname.split('/').pop();
        if (path === 'dashboard' || path === '') return 'Overview';
        return path.replace(/-/g, ' ');
    };

    return (
        <div className="dashboard-wrapper">
            <style>{`
                .sidebar { background: ${darkBg} !important; border-right: 2px solid ${goldColor}33; }
                .sidebar-menu { flex: 1; overflow-y: auto; padding-right: 5px; }
                .sidebar-menu::-webkit-scrollbar { width: 5px; }
                .sidebar-menu::-webkit-scrollbar-thumb { background: ${goldColor}44; border-radius: 10px; }
                .menu-item { transition: all 0.2s ease; border-left: 3px solid transparent; margin-bottom: 2px; color: rgba(255,255,255,0.6) !important; }
                .menu-item:hover { background: rgba(212, 175, 55, 0.1); color: ${goldColor} !important; }
                .menu-item.active { background: rgba(212, 175, 55, 0.15); color: ${goldColor} !important; border-left: 3px solid ${goldColor}; font-weight: 600; }
                .menu-item.active svg { color: ${goldColor} !important; }
                .main-content { height: 100vh; overflow-y: auto; display: flex; flex-direction: column; background-color: #f8f9fa; }
                .top-navbar { border-bottom: 2px solid ${goldColor}22; }
                @media (max-width: 991px) { .sidebar { position: fixed; z-index: 1050; transition: all 0.3s ease; left: -280px; } .sidebar.mobile-open { left: 0; } }
            `}</style>

            {isMobileMenuOpen && (
                <div className="mobile-overlay no-print" onClick={closeMobileMenu}
                     style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1040 }}>
                </div>
            )}

            <aside className={`sidebar d-flex flex-column ${isMobileMenuOpen ? 'mobile-open' : ''}`}
                   style={{ width: '280px', height: '100vh', color: '#fff' }}>

                <div className="sidebar-header p-4 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25">
                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <div className="flex-shrink-0 d-flex align-items-center justify-content-center bg-white rounded-circle"
                             style={{ width: '35px', height: '35px', border: `1px solid ${goldColor}` }}>
                            {schoolInfo.logo ? (
                                <img src={schoolInfo.logo} alt="L" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                            ) : (
                                <BookOpen size={20} style={{ color: goldColor }} />
                            )}
                        </div>
                        <h5 className="fw-black mb-0 text-white text-uppercase"
                            style={{ letterSpacing: '0.5px', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {schoolInfo.name}
                        </h5>
                    </div>
                    <button className="btn btn-link text-white d-lg-none p-0" onClick={closeMobileMenu}><X size={24} /></button>
                </div>

                <nav className="sidebar-menu px-3 py-3">
                    <p className="menu-label small text-uppercase fw-bold mt-2 mb-2 px-2" style={{ color: goldColor, opacity: 0.7, fontSize: '0.7rem' }}>Main</p>
                    <Link to="/dashboard" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={closeMobileMenu}>
                        <LayoutDashboard size={20} /><span>Dashboard</span>
                    </Link>

                    {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
                        <>
                            <p className="menu-label small text-uppercase fw-bold mt-4 mb-2 px-2" style={{ color: goldColor, opacity: 0.7, fontSize: '0.7rem' }}>Academic</p>
                            <Link to="/dashboard/students" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/students') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <Users size={20} /><span>Pupil Registry</span>
                            </Link>
                            <Link to="/dashboard/attendance" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/attendance') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <CalendarCheck size={20} /><span>Attendance</span>
                            </Link>
                            <Link to="/dashboard/exams" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/exams') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <PenTool size={20} /><span>Exam Scores</span>
                            </Link>
                            <Link to="/dashboard/reports" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/reports') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <FileText size={20} /><span>Terminal Reports</span>
                            </Link>
                        </>
                    )}

                    {(userRole === 'ADMIN' || userRole === 'BURSAR') && (
                        <>
                            <p className="menu-label small text-uppercase fw-bold mt-4 mb-2 px-2" style={{ color: goldColor, opacity: 0.7, fontSize: '0.7rem' }}>Finance</p>
                            <Link to="/dashboard/fees" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/fees') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <Wallet size={20} /><span>Fee Payments</span>
                            </Link>
                            <Link to="/dashboard/debtors" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/debtors') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <AlertTriangle size={20} /><span>Debtors List</span>
                            </Link>
                            <Link to="/dashboard/finance-summary" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/finance-summary') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <BarChart3 size={20} /><span>Finance Summary</span>
                            </Link>
                        </>
                    )}

                    {userRole === 'ADMIN' && (
                        <>
                            <p className="menu-label small text-uppercase fw-bold mt-4 mb-2 px-2" style={{ color: goldColor, opacity: 0.7, fontSize: '0.7rem' }}>Admin Control</p>
                            <Link to="/dashboard/teachers" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/teachers') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <UserCog size={20} /><span>Staff Management</span>
                            </Link>
                            <Link to="/dashboard/subjects" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/subjects') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <BookOpen size={20} /><span>Manage Subjects</span>
                            </Link>
                            <Link to="/dashboard/classes" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/classes') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <LayoutGrid size={20} /><span>Manage Classes</span>
                            </Link>
                            <Link to="/dashboard/users" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/users') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <ShieldPlus size={20} /><span>User Accounts</span>
                            </Link>
                            <Link to="/dashboard/promotion" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/promotion') ? 'active text-danger fw-bold' : ''}`} onClick={closeMobileMenu}>
                                <TrendingUp size={20} /><span>Promote Students</span>
                            </Link>
                            <Link to="/dashboard/settings" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/settings') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <Settings size={20} /><span>Settings</span>
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-3 border-top border-secondary border-opacity-25">
                    <button onClick={handleLogout} className="btn btn-link text-danger text-decoration-none d-flex align-items-center gap-2 p-2 w-100">
                        <LogOut size={20} /><span className="fw-bold">Logout</span>
                    </button>
                </div>
            </aside>

            <main className="main-content flex-grow-1">
                <header className="top-navbar bg-white shadow-sm d-flex align-items-center justify-content-between px-4" style={{ height: '70px' }}>
                    <div className="d-flex align-items-center text-muted">
                        <button className="btn btn-link text-muted d-lg-none me-2 p-0" onClick={toggleMobileMenu}><Menu size={24} /></button>
                        <Home size={18} className="me-2 d-none d-md-block" style={{ color: goldColor }} />
                        <span className="small text-uppercase d-none d-sm-inline opacity-75 fw-black" style={{ letterSpacing: '0.5px' }}>
                            {getPageTitle()}
                        </span>
                    </div>

                    <div className="position-relative">
                        <div className="d-flex align-items-center gap-2" onClick={() => setIsProfileOpen(!isProfileOpen)} style={{ cursor: 'pointer' }}>
                            <div className="text-end d-none d-sm-block">
                                <div className="fw-bold text-dark small mb-0">{userName}</div>
                                <span className="badge border border-warning-subtle text-dark x-small" style={{ fontSize: '10px', backgroundColor: `${goldColor}22` }}>{userRole}</span>
                            </div>
                            <div className="rounded-circle p-1 border border-2 border-warning-subtle"><UserCircle size={30} style={{ color: darkBg }} /></div>
                        </div>
                        {isProfileOpen && (
                            <div className="card shadow-lg border-0 rounded-4 position-absolute end-0 mt-2 p-3" style={{ width: '240px', zIndex: 1100, borderTop: `4px solid ${goldColor}` }}>
                                <div className="text-center mb-3">
                                    <div className="d-inline-block p-2 rounded-circle mb-2" style={{ backgroundColor: `${goldColor}11` }}><User size={24} style={{ color: goldColor }} /></div>
                                    <h6 className="fw-bold mb-0 small">{userName}</h6>
                                    <div className="text-muted" style={{ fontSize: '11px' }}>@{loginID}</div>
                                </div>
                                <hr className="my-2 opacity-25" />
                                <button onClick={handleLogout} className="btn btn-sm btn-dark w-100 rounded-pill py-2"><LogOut size={14} className="me-1 text-warning"/> Sign Out</button>
                            </div>
                        )}
                    </div>
                </header>
                <div className="content-body"><Outlet /></div>
            </main>
        </div>
    );
};

export default DashboardLayout;