import axios from 'axios';

// Detect if we are running locally on any machine (dev server, static jar, or custom port)
const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';

// Dynamic Base URL allocation:
// 1. If running on localhost, use the current host's address (e.g., http://localhost:8080/api)
// 2. Otherwise, fall back to your live Render API URL
const baseURL = isLocalhost
    ? `${window.location.origin}/api`
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
    
    // Allow unauthenticated GET requests to reach public settings
    if (config.url.endsWith('/settings') && config.method?.toLowerCase() === 'get') {
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
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 403) {
            console.error("[API Error] 403 Forbidden: Check JWT or Permissions.");
        }
        return Promise.reject(error);
    }
);

export default API;