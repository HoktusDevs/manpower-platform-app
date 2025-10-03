import axios from 'axios';
import { logger } from './logger';

// Create axios instance with default config
export const apiClient = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and logging
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cognito_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request en desarrollo
    logger.debug('API Request', {
      method: config.method,
      url: config.url,
      data: config.data,
    });

    return config;
  },
  (error) => {
    logger.error('API Request Error', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response en desarrollo
    logger.debug('API Response', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });

    return response;
  },
  (error) => {
    // Log error details
    logger.error('API Error', error, {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      // Token expired or invalid
      logger.warn('Session expired - redirecting to login');
      localStorage.clear();
      window.location.href = '/login?redirect=applicant&error=session_expired';
    }

    return Promise.reject(error);
  }
);
