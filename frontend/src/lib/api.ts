import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only redirect to login for 401 errors on non-settings endpoints
    // and only if we haven't already retried
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/');
      
      // Don't redirect for auth endpoints (login itself) or if already retrying
      if (!isAuthEndpoint && !error.config?._retry) {
        error.config._retry = true;
        // Don't auto-redirect, let the page handle the error
        console.warn('API returned 401 for:', url);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
