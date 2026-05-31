import axios from 'axios';

// Detect environment using standard Vite variable conventions
const isProduction = import.meta.env.PROD;

const API = axios.create({
    // In production, point directly to your live Render backend URL
    // In development, point directly to your local Spring Boot server (port 8080)
    baseURL: isProduction 
        ? 'https://your-backend-service-name.onrender.com/api' // Replace with your actual live Render Service URL
        : 'http://localhost:8080/api', 
    headers: {
        'Content-Type': 'application/json'
    }
});

// REQUEST INTERCEPTOR
API.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');

    // Updated debugging logs for Vite tracking
    console.log(`[API Request] Path: ${config.url} | IsProd: ${isProduction}`);
    
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