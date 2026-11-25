import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, Outlet, useLocation } from 'react-router-dom';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import StudentList from './components/StudentList';
import TeacherList from './components/TeacherList';
import Attendance from './components/Attendance';
import StaffAttendance from './components/StaffAttendance';
import Timetable from './components/Timetable';
import LessonNotes from './components/LessonNotes';
import UserManagement from './components/UserManagement.jsx';
import Exams from './components/Exams';
import ReportCard from './components/ReportCard';
import Fees from './components/Fees';
import DebtorsList from './components/DebtorsList';
import FinanceSummary from './components/FinanceSummary';
import Expenses from './components/Expenses';
import CanteenManagement from './components/CanteenManagement';
import Payroll from './components/Payroll';
import Settings from './components/Settings';
import PromotionManager from './components/PromotionManager';
import ClassSettings from './components/ClassSettings';
import AttendanceDashboard from './components/AttendanceDashboard';
import AttendanceSummary from './components/AttendanceSummary';
import SubjectManagement from './components/SubjectManagement';
import LearningHub from './components/LearningHub';
import API from './services/api';
import SubscriptionPage, { SubscriptionGate } from './components/SubscriptionPage';

import {
    Users, UserCog, Wallet, ShieldPlus,
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
    const [data, setData] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalTeachingStaff: 0,
        totalNonTeachingStaff: 0,
        totalStaff: 0,
        totalDirectors: 0,
        totalManagers: 0,
        totalCollected: 0,
        totalDebt: 0
    });
    const [availableBalance, setAvailableBalance] = useState(null);
    const [schoolName, setSchoolName] = useState('EDUMANAGER');
    const userRole = sessionStorage.getItem('userRole');
    const canViewFinance = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'BURSAR'].includes(userRole);

    const goldColor = 'var(--theme-accent)';
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
                    totalTeachingStaff: statsRes.data.totalTeachingStaff || 0,
                    totalNonTeachingStaff: statsRes.data.totalNonTeachingStaff || 0,
                    totalStaff: statsRes.data.totalStaff || 0,
                    totalDirectors: statsRes.data.totalDirectors || 0,
                    totalManagers: statsRes.data.totalManagers || 0,
                    totalCollected: canViewFinance ? statsRes.data.totalCollected || 0 : 0,
                    totalDebt: canViewFinance ? statsRes.data.totalDebt || 0 : 0
                });

                if (settingsRes.data?.schoolName) {
                    setSchoolName(settingsRes.data.schoolName);
                }
            } catch (err) {
                console.error("Dashboard Load Error:", err);
            }
        };
        loadDashboard();

        if (canViewFinance) {
            API.get('/expenses/account-summary')
                .then(response => setAvailableBalance(response.data.availableBalance))
                .catch(err => console.error("Account Balance Load Error:", err));
        }
    }, [canViewFinance]);

    const stats = [
        { label: 'Total Pupils', value: data.totalStudents, icon: <Users size={22}/>, bg: 'var(--theme-accent-soft)', border: goldColor },
        { label: 'Total Staff', value: data.totalStaff, icon: <UserCog size={22}/>, bg: '#f8f9fa', border: darkColor },
        { label: 'Teaching Staff', value: data.totalTeachingStaff, icon: <UserCog size={22}/>, bg: '#f8f9fa', border: darkColor },
        { label: 'Non-Teaching Staff', value: data.totalNonTeachingStaff, icon: <Users size={22}/>, bg: 'var(--theme-accent-soft)', border: goldColor },
        { label: 'Directors / Board', value: data.totalDirectors, icon: <ShieldPlus size={22}/>, bg: '#f8f9fa', border: darkColor },
        { label: 'Managers', value: data.totalManagers, icon: <UserCog size={22}/>, bg: 'var(--theme-accent-soft)', border: goldColor },
        ...(canViewFinance ? [
            { label: 'Fees Collected', value: `₵${data.totalCollected.toLocaleString()}`, icon: <Wallet size={22}/>, bg: 'var(--theme-accent-soft)', border: goldColor },
            { label: 'Outstanding', value: `₵${data.totalDebt.toLocaleString()}`, icon: <AlertTriangle size={22}/>, bg: '#fff5f5', border: '#e74a3b' },
            { label: 'Available Balance · All Time', value: availableBalance === null ? '—' : `₵${Number(availableBalance).toLocaleString()}`, icon: <Wallet size={22}/>, bg: 'var(--theme-accent-soft)', border: goldColor }
        ] : [])
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
            {['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'TEACHER'].includes(userRole) && (
                <div className="mt-4">
                    <AttendanceSummary />
                </div>
            )}
        </div>
    );
};

const StudentDashboardRedirect = () => {
    const userRole = sessionStorage.getItem('userRole');
    return userRole === 'STUDENT' ? <Navigate to="/dashboard/learning" replace /> : <DashboardHome />;
};

const SubscriptionRouteRedirect = () => {
    const location = useLocation();
    return <Navigate to={{ pathname: '/dashboard/subscription', search: location.search }} replace />;
};

// --- MAIN APP COMPONENT ---
function App() {
    return (
        <Router>
            <PageTitleManager />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/subscription" element={<SubscriptionRouteRedirect />} />

                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route element={<SubscriptionGate />}>
                        <Route index element={<StudentDashboardRedirect />} />
                        <Route path="learning" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'TEACHER', 'STUDENT']}><LearningHub /></ProtectedRoute>} />
                        <Route path="students" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER']}><StudentList /></ProtectedRoute>} />
                        <Route path="attendance" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'TEACHER']}><Attendance /></ProtectedRoute>} />
                        <Route path="attendance-summary" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'TEACHER']}><AttendanceSummary /></ProtectedRoute>} />
                        <Route path="timetable" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'TEACHER']}><Timetable /></ProtectedRoute>} />
                        <Route path="lesson-notes" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'TEACHER']}><LessonNotes /></ProtectedRoute>} />
                        <Route path="staff-attendance" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER']}><StaffAttendance /></ProtectedRoute>} />
                        <Route path="exams" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'TEACHER']}><Exams /></ProtectedRoute>} />
                        <Route path="reports" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'TEACHER']}><ReportCard /></ProtectedRoute>} />
                        <Route path="fees" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'BURSAR']}><Fees /></ProtectedRoute>} />
                        <Route path="debtors" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'BURSAR']}><DebtorsList /></ProtectedRoute>} />
                        <Route path="finance-summary" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'BURSAR']}><FinanceSummary /></ProtectedRoute>} />
                        <Route path="expenses" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'BURSAR']}><Expenses /></ProtectedRoute>} />
                        <Route path="canteen" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'BURSAR']}><CanteenManagement /></ProtectedRoute>} />
                        <Route path="payroll" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'BURSAR']}><Payroll /></ProtectedRoute>} />
                        <Route path="teachers" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER']}><TeacherList /></ProtectedRoute>} />
                        <Route path="users" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><UserManagement /></ProtectedRoute>} />
                        <Route path="settings" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Settings /></ProtectedRoute>} />
                        <Route path="classes" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER']}><ClassSettings /></ProtectedRoute>} />
                        <Route path="promotion" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER']}><PromotionManager /></ProtectedRoute>} />
                        <Route path="subjects" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER']}><SubjectManagement /></ProtectedRoute>} />
                    </Route>
                    <Route path="subscription" element={<SubscriptionPage />} />
                </Route>

                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;