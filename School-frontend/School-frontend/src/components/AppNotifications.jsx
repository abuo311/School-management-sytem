import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, WifiOff, X } from 'lucide-react';
import { notify } from '../services/notifications';
import '../styles/Notifications.css';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'appLastActivityAt';

const toastIcons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertCircle,
    offline: WifiOff,
    info: Info
};

const AppNotifications = () => {
    const navigate = useNavigate();
    const [toasts, setToasts] = useState([]);
    const nextToastId = useRef(0);
    const recentToasts = useRef(new Map());

    useEffect(() => {
        const handleToast = event => {
            const { message, type = 'info' } = event.detail || {};
            if (!message) return;

            const dedupeKey = `${type}:${message}`;
            const now = Date.now();
            if (now - (recentToasts.current.get(dedupeKey) || 0) < 1500) return;
            recentToasts.current.forEach((createdAt, key) => {
                if (now - createdAt > 10000) recentToasts.current.delete(key);
            });
            recentToasts.current.set(dedupeKey, now);

            const id = ++nextToastId.current;
            const toast = { id, message, type };
            setToasts(current => [...current.slice(-3), toast]);
            window.setTimeout(() => {
                setToasts(current => current.filter(item => item.id !== id));
            }, type === 'error' || type === 'offline' ? 7000 : 4500);
        };

        const handleOffline = () => notify('Connection lost. Check your internet connection and try again.', 'offline');
        const handleOnline = () => notify('Connection restored.', 'success');

        window.addEventListener('app:toast', handleToast);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        if (!navigator.onLine) handleOffline();
        return () => {
            window.removeEventListener('app:toast', handleToast);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    useEffect(() => {
        let timer;
        let lastPersistedActivity = 0;

        const clearTimer = () => {
            if (timer) window.clearTimeout(timer);
        };

        const endSession = () => {
            if (!sessionStorage.getItem('token')) return;
            sessionStorage.clear();
            notify('You were signed out after five minutes of inactivity.', 'warning');
            navigate('/login', { replace: true });
        };

        const scheduleLogout = () => {
            clearTimer();
            if (!sessionStorage.getItem('token')) return;

            let lastActivity = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY));
            if (!Number.isFinite(lastActivity) || lastActivity <= 0) {
                lastActivity = Date.now();
                sessionStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivity));
            }

            const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
            timer = window.setTimeout(endSession, Math.max(remaining, 0));
        };

        const recordActivity = () => {
            if (!sessionStorage.getItem('token')) return;
            const now = Date.now();
            if (now - lastPersistedActivity >= 1000) {
                sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
                lastPersistedActivity = now;
            }
            scheduleLogout();
        };

        const startAuthenticatedSession = () => {
            const now = Date.now();
            sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
            lastPersistedActivity = now;
            scheduleLogout();
        };

        const checkOnVisibility = () => {
            if (document.visibilityState === 'visible') scheduleLogout();
        };

        const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'click'];
        activityEvents.forEach(eventName => {
            window.addEventListener(eventName, recordActivity, { passive: true });
        });
        window.addEventListener('app:authenticated', startAuthenticatedSession);
        document.addEventListener('visibilitychange', checkOnVisibility);
        scheduleLogout();

        return () => {
            clearTimer();
            activityEvents.forEach(eventName => {
                window.removeEventListener(eventName, recordActivity);
            });
            window.removeEventListener('app:authenticated', startAuthenticatedSession);
            document.removeEventListener('visibilitychange', checkOnVisibility);
        };
    }, [navigate]);

    return (
        <div className="app-toast-stack" aria-live="polite" aria-relevant="additions">
            {toasts.map(({ id, message, type }) => {
                const Icon = toastIcons[type] || toastIcons.info;
                return (
                    <div className={`app-toast app-toast-${type}`} key={id} role={type === 'error' ? 'alert' : 'status'}>
                        <Icon size={20} className="app-toast-icon" aria-hidden="true" />
                        <span className="app-toast-message">{message}</span>
                        <button
                            type="button"
                            className="app-toast-close"
                            aria-label="Dismiss notification"
                            onClick={() => setToasts(current => current.filter(item => item.id !== id))}
                        >
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default AppNotifications;
