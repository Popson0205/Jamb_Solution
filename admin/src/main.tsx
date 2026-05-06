import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';

// Point axios at the API service URL in production
// Set VITE_API_URL env var in Render dashboard for the admin portal
const apiBase = import.meta.env.VITE_API_URL || '';
if (apiBase) {
  axios.defaults.baseURL = apiBase;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
