import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach Bearer token ─────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const isEmployee = window.location.pathname.startsWith('/employee');
    const token = isEmployee
      ? (localStorage.getItem('employee_token') || localStorage.getItem('admin_token'))
      : (localStorage.getItem('admin_token') || localStorage.getItem('employee_token'));
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: handle 401 → redirect to login ────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname.startsWith('/employee')) {
        localStorage.removeItem('employee_token');
        window.location.href = '/employee/login';
      } else {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

