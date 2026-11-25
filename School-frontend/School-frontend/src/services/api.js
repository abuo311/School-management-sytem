import axios from 'axios';
import { notify } from './notifications';

// Detect if we are running locally on any machine (dev server, static jar, or custom port)
const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';

// Dynamic Base URL allocation:
// 1. If running on localhost, use the current host's address (e.g., http://localhost:8080/api)
// 2. Otherwise, fall back to your live Render API URL
const baseURL = isLocalhost
    ? `http://${window.location.hostname}:8080/api`
    : 'https://school-management-sytem.onrender.com/api';

const API = axios.create({
    baseURL: baseURL, 
    headers: {
        'Content-Type': 'application/json'
    }
});

// REQUEST INTERCEPTOR
API.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');

    // Updated debugging logs for tracking
    console.log(`[API Request] Path: ${config.url} | Resolved BaseURL: ${baseURL}`);
    
    // Allow public read-only endpoints without a login token.
    if (config.method?.toLowerCase() === 'get' &&
        (config.url.endsWith('/settings') || config.url.endsWith('/subscription/plans'))) {
        return config;
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        console.warn(`[API Auth] WARNING: No token found for ${config.url}`);
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// RESPONSE INTERCEPTOR
API.interceptors.response.use(
    (response) => {
        const requestUrl = response.config.url || '';
        const method = (response.config.method || 'get').toLowerCase();
        if (requestUrl.includes('/auth/login')) {
            notify('Signed in successfully.', 'success');
            window.dispatchEvent(new Event('app:authenticated'));
        } else if (['post', 'put', 'patch', 'delete'].includes(method)
            && !requestUrl.includes('/paystack/initialize')
            && !requestUrl.includes('/subscription/checkout')) {
            const responseMessage = typeof response.data === 'string'
                ? response.data
                : response.data?.message;
            const defaultMessage = method === 'delete'
                ? 'Deleted successfully.'
                : method === 'post'
                    ? 'Action completed successfully.'
                    : 'Changes saved successfully.';
            notify(responseMessage || defaultMessage, 'success');
        }
        return response;
    },
    (error) => {
        if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
            return Promise.reject(error);
        }

        const requestUrl = error.config?.url || '';
        const status = error.response?.status;
        if (!error.response) {
            notify('Connection lost. Check your internet connection and try again.', 'offline');
        } else if (requestUrl.includes('/auth/login') && (status === 401 || status === 403)) {
            notify('Username or password mismatch. Check your credentials and try again.', 'error');
        } else if (status === 401) {
            notify('Your session is no longer valid. Please sign in again.', 'warning');
        } else if (status === 403) {
            notify('You do not have permission to perform this action.', 'error');
        } else {
            const responseMessage = typeof error.response.data === 'string'
                ? error.response.data
                : error.response.data?.message;
            const fallbackMessage = status >= 500
                ? 'The service is temporarily unavailable. Please try again.'
                : 'The action could not be completed. Please try again.';
            notify(responseMessage || fallbackMessage, 'error');
        }

        if (status === 403) {
            console.error("[API Error] 403 Forbidden: Check JWT or Permissions.");
        }
        return Promise.reject(error);
    }
);

export default API;