import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, Outlet, useLocation } from 'react-router-dom';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import StudentList from './components/StudentList';
import TeacherList from './components/TeacherList';
import Attendance from './components/Attendance';
import UserManagement from './components/UserManagement.jsx';
import Exams from './components/Exams';
import ReportCard from './components/ReportCard';
import Fees from './components/Fees';
import DebtorsList from './components/DebtorsList';
import FinanceSummary from './components/FinanceSummary';
import Settings from './components/Settings';
import PromotionManager from './components/PromotionManager';
import ClassSettings from './components/ClassSettings';
import AttendanceDashboard from './components/AttendanceDashboard';
import SubjectManagement from './components/SubjectManagement';
import API from './services/api';

import {
    Users, UserCog, Wallet,
    AlertTriangle, CalendarCheck, PenTool, TrendingUp, Award
} from 'lucide-react';

// --- PROTECTED ROUTE LOGIC ---
const ProtectedRoute = ({ children, allowedRoles }) => {
    const isAuthenticated = sessionStorage.getItem('token') !== null;
    const userRole = sessionStorage.getItem('userRole');

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/dashboard" replace />;

    return children ? children : <Outlet />;
};

// --- TITLE SYNC COMPONENT ---
const PageTitleManager = () => {
    const location = useLocation();

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        
        // Prevent API call if not logged in
        if (!token) {
            document.title = "EDUMANAGER | Login";
            return;
        }

        const syncTitle = async () => {
            try {
                const res = await API.get('/settings');
                const schoolName = res.data?.schoolName || 'EDUMANAGER';

                const path = location.pathname.split('/').pop();
                const pageName = path === 'dashboard' || path === '' ? 'Portal' : path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');

                document.title = `${schoolName.toUpperCase()} | ${pageName}`;
            } catch {
                document.title = "EDUMANAGER | Portal";
            }
        };
        syncTitle();
    }, [location]);

    return null;
};

// --- DASHBOARD HOME COMPONENT ---
const DashboardHome = () => {
    const [data, setData] = useState({ totalStudents: 0, totalTeachers: 0, totalCollected: 0, totalDebt: 0 });
    const [schoolName, setSchoolName] = useState('EDUMANAGER');

    const goldColor = '#d4af37';
    const darkColor = '#1a1a1a';

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        
        // Prevent API calls if token is missing
        if (!token) return;

        const loadDashboard = async () => {
            try {
                const [statsRes, settingsRes] = await Promise.all([
                    API.get('/dashboard/stats'),
                    API.get('/settings')
                ]);
                setData({
                    totalStudents: statsRes.data.totalStudents || 0,
                    totalTeachers: statsRes.data.totalTeachers || 0,
                    totalCollected: statsRes.data.totalCollected || 0,
                    totalDebt: statsRes.data.totalDebt || 0
                });

                if (settingsRes.data?.schoolName) {
                    setSchoolName(settingsRes.data.schoolName);
                }
            } catch (err) {
                console.error("Dashboard Load Error:", err);
            }
        };
        loadDashboard();
    }, []);

    const stats = [
        { label: 'Total Pupils', value: data.totalStudents, icon: <Users size={22}/>, bg: '#fdfcf0', border: goldColor },
        { label: 'Staff Count', value: data.totalTeachers, icon: <UserCog size={22}/>, bg: '#f8f9fa', border: darkColor },
        { label: 'Fees Collected', value: `₵${data.totalCollected.toLocaleString()}`, icon: <Wallet size={22}/>, bg: '#fdfcf0', border: goldColor },
        { label: 'Outstanding', value: `₵${data.totalDebt.toLocaleString()}`, icon: <AlertTriangle size={22}/>, bg: '#fff5f5', border: '#e74a3b' },
    ];

    return (
        <div className="animate__animated animate__fadeIn p-3 text-start">
            <header className="mb-4 border-bottom pb-3">
                <h2 className="fw-black mb-0 text-uppercase" style={{ color: darkColor, letterSpacing: '1px' }}>
                    {schoolName}
                </h2>
                <div className="d-flex align-items-center gap-2">
                    <span className="badge" style={{ backgroundColor: goldColor, color: '#000' }}>MANAGEMENT PORTAL</span>
                    <p className="text-muted small mb-0 fw-bold">
                        {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </header>

            <div className="row g-4 mb-4">
                {stats.map((stat, i) => (
                    <div key={i} className="col-md-3">
                        <div className="card border-0 shadow-sm p-3 rounded-4 bg-white"
                             style={{ borderLeft: `5px solid ${stat.border}` }}>
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <p className="text-muted small fw-black mb-1 text-uppercase" style={{ fontSize: '0.65rem' }}>{stat.label}</p>
                                    <h3 className="fw-black mb-0" style={{ color: darkColor }}>{stat.value}</h3>
                                </div>
                                <div className="p-3 rounded-circle shadow-sm" style={{ backgroundColor: stat.bg, color: stat.border }}>
                                    {stat.icon}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4">
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 p-2 bg-white h-100">
                        <AttendanceDashboard />
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                        <h5 className="fw-black mb-4 text-uppercase border-bottom pb-2" style={{ fontSize: '0.9rem', color: darkColor }}>
                            Quick Actions
                        </h5>
                        <div className="d-grid gap-3">
                            <Link to="/dashboard/attendance" className="btn btn-light text-start border shadow-sm p-3 rounded-3 d-flex align-items-center gap-3">
                                <div className="p-2 rounded bg-dark"><CalendarCheck size={18} style={{ color: goldColor }}/></div>
                                <div><span className="fw-bold d-block small">Attendance</span><small className="text-muted">Daily tracking</small></div>
                            </Link>
                            <Link to="/dashboard/exams" className="btn btn-light text-start border shadow-sm p-3 rounded-3 d-flex align-items-center gap-3">
                                <div className="p-2 rounded bg-dark"><PenTool size={18} style={{ color: goldColor }}/></div>
                                <div><span className="fw-bold d-block small">Exam Entry</span><small className="text-muted">Record scores</small></div>
                            </Link>
                            <Link to="/dashboard/reports" className="btn btn-light text-start border shadow-sm p-3 rounded-3 d-flex align-items-center gap-3">
                                <div className="p-2 rounded bg-dark"><Award size={18} style={{ color: goldColor }}/></div>
                                <div><span className="fw-bold d-block small">Terminal Reports</span><small className="text-muted">Print results</small></div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
function App() {
    return (
        <Router>
            <PageTitleManager />
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route index element={<DashboardHome />} />
                    <Route path="students" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><StudentList /></ProtectedRoute>} />
                    <Route path="attendance" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><Attendance /></ProtectedRoute>} />
                    <Route path="exams" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><Exams /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><ReportCard /></ProtectedRoute>} />
                    <Route path="fees" element={<ProtectedRoute allowedRoles={['ADMIN', 'BURSAR']}><Fees /></ProtectedRoute>} />
                    <Route path="debtors" element={<ProtectedRoute allowedRoles={['ADMIN', 'BURSAR']}><DebtorsList /></ProtectedRoute>} />
                    <Route path="finance-summary" element={<ProtectedRoute allowedRoles={['ADMIN', 'BURSAR']}><FinanceSummary /></ProtectedRoute>} />
                    <Route path="teachers" element={<ProtectedRoute allowedRoles={['ADMIN']}><TeacherList /></ProtectedRoute>} />
                    <Route path="users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UserManagement /></ProtectedRoute>} />
                    <Route path="settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><Settings /></ProtectedRoute>} />
                    <Route path="classes" element={<ProtectedRoute allowedRoles={['ADMIN']}><ClassSettings /></ProtectedRoute>} />
                    <Route path="promotion" element={<ProtectedRoute allowedRoles={['ADMIN']}><PromotionManager /></ProtectedRoute>} />
                    <Route path="subjects" element={<ProtectedRoute allowedRoles={['ADMIN']}><SubjectManagement /></ProtectedRoute>} />
                </Route>

                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;