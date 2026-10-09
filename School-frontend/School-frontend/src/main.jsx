import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { getSchoolTheme } from './theme';

// MUST include the JS bundle for modals to work
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

try {
  const theme = getSchoolTheme(localStorage.getItem('schoolTheme'));
  document.documentElement.style.setProperty('--theme-accent', theme.color);
  document.documentElement.style.setProperty('--theme-accent-soft', theme.soft);
} catch (error) {
  console.error('Unable to load saved color theme:', error);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);