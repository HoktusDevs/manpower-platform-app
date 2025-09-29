/**
 * Axios Configuration
 * Centralized HTTP client configuration using Axios
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/api.config';

/**
 * Create an Axios instance with common configuration
 */
const createAxiosInstance = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Request interceptor to add authentication token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Get access token from localStorage
      const accessToken = localStorage.getItem('cognito_access_token');

      // Add authorization header if token exists
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      return config;
    },
    (error: AxiosError) => {
      // Log errors in development
      if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
        console.error('Axios request error:', error);
      }
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle responses and errors
  instance.interceptors.response.use(
    (response) => {
      // Return the response data directly
      return response.data;
    },
    (error: AxiosError) => {
      // Log errors in development
      if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
        console.error('Axios response error:', error);
      }

      // Extract error message
      let errorMessage = 'Request failed';

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `Request failed with status ${error.response.status}`;
        if (error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data) {
          errorMessage = (error.response.data as { message: string }).message;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from server';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message || 'Request setup failed';
      }

      // Create a new error with the extracted message
      const customError = new Error(errorMessage);
      // Preserve the original error details
      Object.defineProperty(customError, 'originalError', {
        value: error,
        enumerable: false,
        writable: false,
      });

      return Promise.reject(customError);
    }
  );

  return instance;
};

/**
 * Axios instance for Folders Service
 */
export const foldersAxios = createAxiosInstance(API_CONFIG.folders.baseUrl);

/**
 * Axios instance for Applications Service
 */
export const applicationsAxios = createAxiosInstance(API_CONFIG.applications.baseUrl);

/**
 * Axios instance for OCR Service
 */
export const ocrAxios = createAxiosInstance(API_CONFIG.ocr.baseUrl);

/**
 * Axios instance for Document Processing Service
 */
export const documentProcessingAxios = createAxiosInstance(API_CONFIG.documentProcessing.baseUrl);