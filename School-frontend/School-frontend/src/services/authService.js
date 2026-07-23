import API from './api';

const login = async (username, password) => {
    const response = await API.post('/auth/login', { username, password });
    if (response.data.token) {
        // Changed from localStorage to sessionStorage
        // Data here is deleted automatically on refresh or tab close
        sessionStorage.setItem('token', response.data.token);
        sessionStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
};

const logout = () => {
    // Clear sessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
};

const getCurrentUser = () => {
    // Retrieve from sessionStorage
    return JSON.parse(sessionStorage.getItem('user'));
};

export default { login, logout, getCurrentUser };