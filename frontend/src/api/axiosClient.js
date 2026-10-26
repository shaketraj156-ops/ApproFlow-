import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Supabase JWT Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('approflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error handling & 401 redirect
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // The portal signs in as a demo persona with a placeholder token that a real backend rightly rejects.
    // For that session a 401 is expected: leave the user signed in and let the services fall back to mock data.
    const isDemoSession = localStorage.getItem('approflow_token') === 'mock_jwt_token_approflow';
    if (error.response?.status === 401 && !isDemoSession) {
      localStorage.removeItem('approflow_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
