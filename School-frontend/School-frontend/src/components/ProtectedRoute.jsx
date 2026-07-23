import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const location = useLocation();

    // FIXED: Changed from localStorage to sessionStorage
    // sessionStorage clears automatically on page refresh
    const isAuthenticated = sessionStorage.getItem('token') !== null;
    const userRole = sessionStorage.getItem('userRole'); // e.g., "ADMIN", "TEACHER"

    // 1. If not logged in (or if page was refreshed), send to login page
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. If roles are specified and user's role isn't allowed, send to dashboard
    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    // 3. If all checks pass, show the requested page
    return children;
};

export default ProtectedRoute;