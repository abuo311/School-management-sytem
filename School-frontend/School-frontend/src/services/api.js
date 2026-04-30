import axios from 'axios';

// Detect if we are running in production (Docker) or development
const isProduction = process.env.NODE_ENV === 'production';

const API = axios.create({
    // In production, we use a relative path so it hits the Docker container's own port.
    // In development, we point to the local Spring Boot server.
    baseURL: isProduction ? '/api' : 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// REQUEST INTERCEPTOR
API.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');

    // Debugging logs
    console.log(`[API Request] Path: ${config.url} | Env: ${process.env.NODE_ENV}`);
    
    if (config.url.endsWith('/settings') && config.method === 'get') {
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