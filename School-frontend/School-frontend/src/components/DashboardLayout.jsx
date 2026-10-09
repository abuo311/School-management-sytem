import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';
import {
    LayoutDashboard, Users, UserCog, BookOpen,
    Settings, LogOut, Home, CalendarCheck,
    FileText, PenTool, Wallet, AlertTriangle, BarChart3, Menu, X,
    ShieldPlus, UserCircle, User, LayoutGrid, TrendingUp, Database, Download, ClipboardCheck,
    CalendarClock, NotebookPen, Palette, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import '../styles/Dashboard.css';
import { getSchoolTheme, SCHOOL_THEMES } from '../theme';

const THEME_STORAGE_KEY = 'schoolTheme';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState({ name: 'EduManager', logo: null });
    const [profilePhoto, setProfilePhoto] = useState(sessionStorage.getItem('profilePhoto'));
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [themeId, setThemeId] = useState(() => {
        try {
            return getSchoolTheme(localStorage.getItem(THEME_STORAGE_KEY)).id;
        } catch (error) {
            console.error('Unable to load saved color theme:', error);
            return getSchoolTheme().id;
        }
    });

    const selectedTheme = getSchoolTheme(themeId);
    const goldColor = selectedTheme.color;
    const darkBg = '#1a1a1a';

    const [userName, setUserName] = useState(sessionStorage.getItem('fullName') || sessionStorage.getItem('userName') || 'User');
    const userRole = sessionStorage.getItem('userRole') || 'TEACHER';
    const loginID = sessionStorage.getItem('userName');

    const handleThemeChange = (id) => {
        setThemeId(id);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, id);
        } catch (error) {
            console.error('Unable to save color theme:', error);
        }
    };

    useEffect(() => {
        document.documentElement.style.setProperty('--theme-accent', selectedTheme.color);
        document.documentElement.style.setProperty('--theme-accent-soft', selectedTheme.soft);
    }, [selectedTheme]);

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

    useEffect(() => {
        const syncProfile = () => {
            setProfilePhoto(sessionStorage.getItem('profilePhoto'));
            setUserName(sessionStorage.getItem('fullName') || sessionStorage.getItem('userName') || 'User');
        };
        window.addEventListener('storage', syncProfile);
        window.addEventListener('profile-photo-updated', syncProfile);
        window.addEventListener('user-profile-updated', syncProfile);
        return () => {
            window.removeEventListener('storage', syncProfile);
            window.removeEventListener('profile-photo-updated', syncProfile);
            window.removeEventListener('user-profile-updated', syncProfile);
        };
    }, []);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
    };

    const handleDatabaseBackup = async () => {
        if (!window.confirm('Create a full database backup with both structure and data?')) {
            return;
        }

        try {
            setIsBackingUp(true);
            const response = await API.post('/backup', null, {
                responseType: 'blob'
            });

            const contentDisposition = response.headers['content-disposition'] || '';
            const match = contentDisposition.match(/filename\s*=\s*"?([^";]+)"?/i);
            const filename = match?.[1] || `school-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.sql`;
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
            window.alert(`Backup created successfully as ${filename}`);
        } catch (error) {
            console.error('Database backup failed:', error);
            window.alert('Database backup failed. Ensure the backend can reach MySQL and that mysqldump is installed.');
        } finally {
            setIsBackingUp(false);
        }
    };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    // Helper to format path for header title
    const getPageTitle = () => {
        const path = location.pathname.split('/').pop();
        if (path === 'dashboard' || path === '') return 'Overview';
        return path.replace(/-/g, ' ');
    };

    return (
        <div
            className="dashboard-wrapper"
            style={{
                '--theme-accent': selectedTheme.color,
                '--theme-accent-soft': selectedTheme.soft
            }}
        >
            <style>{`
                .sidebar { background: ${darkBg} !important; border-right: 2px solid ${goldColor}33; transition: margin-left 0.3s ease, left 0.3s ease; }
                @media (min-width: 992px) { .sidebar.desktop-collapsed { margin-left: -280px; } }
                .sidebar-menu { flex: 1; overflow-y: auto; padding-right: 5px; }
                .sidebar-menu::-webkit-scrollbar { width: 5px; }
                .sidebar-menu::-webkit-scrollbar-thumb { background: ${goldColor}44; border-radius: 10px; }
                .menu-item { transition: all 0.2s ease; border-left: 3px solid transparent; margin-bottom: 2px; color: rgba(255,255,255,0.6) !important; }
                .menu-item:hover { background: color-mix(in srgb, ${goldColor} 10%, transparent); color: ${goldColor} !important; }
                .menu-item.active { background: color-mix(in srgb, ${goldColor} 15%, transparent); color: ${goldColor} !important; border-left: 3px solid ${goldColor}; font-weight: 600; }
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

                 <aside className={`sidebar d-flex flex-column ${isMobileMenuOpen ? 'mobile-open' : ''} ${isSidebarCollapsed ? 'desktop-collapsed' : ''}`}
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
                            <Link to="/dashboard/timetable" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/timetable') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <CalendarClock size={20} /><span>Timetable</span>
                            </Link>
                            <Link to="/dashboard/lesson-notes" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/lesson-notes') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <NotebookPen size={20} /><span>Lesson Notes</span>
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
                            <Link to="/dashboard/staff-attendance" className={`menu-item d-flex align-items-center gap-2 p-2 rounded text-decoration-none ${isActive('/dashboard/staff-attendance') ? 'active' : ''}`} onClick={closeMobileMenu}>
                                <ClipboardCheck size={20} /><span>Staff Attendance</span>
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
                    {userRole === 'ADMIN' && (
                        <button
                            onClick={handleDatabaseBackup}
                            disabled={isBackingUp}
                            className="btn btn-outline-warning w-100 rounded-pill mb-2 d-flex align-items-center justify-content-center gap-2"
                        >
                            {isBackingUp ? <span className="spinner-border spinner-border-sm" /> : <Database size={18} />}
                            <span>{isBackingUp ? 'Creating Backup...' : 'Backup Database'}</span>
                        </button>
                    )}
                    <button onClick={handleLogout} className="btn btn-link text-danger text-decoration-none d-flex align-items-center gap-2 p-2 w-100">
                        <LogOut size={20} /><span className="fw-bold">Logout</span>
                    </button>
                </div>
            </aside>

            <main className="main-content flex-grow-1">
                <header className="top-navbar bg-white shadow-sm d-flex align-items-center justify-content-between px-4" style={{ height: '70px' }}>
                    <div className="d-flex align-items-center text-muted">
                        <button className="btn btn-link text-muted d-lg-none me-2 p-0" onClick={toggleMobileMenu}><Menu size={24} /></button>
                        <button
                            type="button"
                            className="btn btn-link text-muted d-none d-lg-inline-flex me-2 p-1"
                            onClick={() => setIsSidebarCollapsed(prev => !prev)}
                            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                        </button>
                        <Home size={18} className="me-2 d-none d-md-block" style={{ color: goldColor }} />
                        <span className="small text-uppercase d-none d-sm-inline opacity-75 fw-black" style={{ letterSpacing: '0.5px' }}>
                            {getPageTitle()}
                        </span>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center gap-1" role="group" aria-label="System color theme">
                            <Palette size={16} className="text-muted me-1" aria-hidden="true" />
                            {SCHOOL_THEMES.map(theme => (
                                <button
                                    key={theme.id}
                                    type="button"
                                    className="theme-swatch"
                                    onClick={() => handleThemeChange(theme.id)}
                                    aria-label={`${theme.label} system theme`}
                                    aria-pressed={selectedTheme.id === theme.id}
                                    title={`${theme.label} theme`}
                                    style={{
                                        '--swatch-color': theme.color,
                                        outline: selectedTheme.id === theme.id ? `2px solid ${theme.color}` : 'none'
                                    }}
                                />
                            ))}
                        </div>
                        <div className="position-relative">
                        <div className="d-flex align-items-center gap-2" onClick={() => setIsProfileOpen(!isProfileOpen)} style={{ cursor: 'pointer' }}>
                            <div className="text-end d-none d-sm-block">
                                <div className="fw-bold text-dark small mb-0">{userName}</div>
                                <span className="badge border border-warning-subtle text-dark x-small" style={{ fontSize: '10px', backgroundColor: `${goldColor}22` }}>{userRole}</span>
                            </div>
                            <div className="rounded-circle border border-2 border-warning-subtle overflow-hidden d-flex align-items-center justify-content-center"
                                 style={{ width: 42, height: 42, background: `${goldColor}11` }}>
                                {profilePhoto ? (
                                    <img src={profilePhoto} alt={`${userName} profile`} className="w-100 h-100" style={{ objectFit: 'cover' }}
                                         onError={() => setProfilePhoto(null)} />
                                ) : <UserCircle size={30} style={{ color: darkBg }} />}
                            </div>
                        </div>
                        {isProfileOpen && (
                            <div className="card shadow-lg border-0 rounded-4 position-absolute end-0 mt-2 p-3" style={{ width: '240px', zIndex: 1100, borderTop: `4px solid ${goldColor}` }}>
                                <div className="text-center mb-3">
                                    <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2 overflow-hidden border"
                                         style={{ width: 72, height: 72, backgroundColor: `${goldColor}11` }}>
                                        {profilePhoto ? (
                                            <img src={profilePhoto} alt={`${userName} profile`} className="w-100 h-100" style={{ objectFit: 'cover' }}
                                                 onError={() => setProfilePhoto(null)} />
                                        ) : <User size={30} style={{ color: goldColor }} />}
                                    </div>
                                    <h6 className="fw-bold mb-0 small">{userName}</h6>
                                    <div className="text-muted" style={{ fontSize: '11px' }}>@{loginID}</div>
                                </div>
                                <hr className="my-2 opacity-25" />
                                <button onClick={handleLogout} className="btn btn-sm btn-dark w-100 rounded-pill py-2"><LogOut size={14} className="me-1 text-warning"/> Sign Out</button>
                            </div>
                        )}
                        </div>
                    </div>
                </header>
                <div className="content-body"><Outlet /></div>
            </main>
        </div>
    );
};

export default DashboardLayout;